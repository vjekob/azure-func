import { Context, HttpRequest } from "@azure/functions";
import { RejectionCallback } from "./RejectionCallback";

const CONSTRAINTS: any = {
    INTERVALS: {
        "1000": 10,
        "5000": 20,
        "10000": 40,
        "30000": 60,
    },

    // All requests are removed from history after this interval
    MAX_INTERVAL: 30000,

    // Number of maximum allowed violations
    MAX_VIOLATIONS: 3,

    // Duration of request ban
    BAN_DURATION: 15000,
}

interface RateLimiterContext {
    ipAddress: string;
    endpoint: string;
    method: string | null;
}

interface PropertyBag<T> {
    [key: string]: T;
}

const log: PropertyBag<number[]> = {};
const violations: PropertyBag<number[]> = {};
const nextRequestAt: PropertyBag<number> = {};

class IPAddress {
    static fromHeaders(req: HttpRequest) {
        let raw = req.headers["x-forwarded-for"] || "";
        let parts = raw.split(":");
        return parts[0] || "<UNKNOWN>";
    }
}

export class RateLimiter {
    private static getContext(req: HttpRequest): RateLimiterContext {
        const ipAddress = IPAddress.fromHeaders(req);
        const method = req.method;
        let url = req.url || (req as any).originalUrl || "";
        const parts = url.split("?")[0].split("/");
        const endpoint = parts[parts.length - 1];
        const appId = req.body?.appId || "";
        return { ipAddress, endpoint, method };
    }

    public static accept(req: HttpRequest, context: Context, rejectCallback?: RejectionCallback): boolean {
        let { ipAddress, endpoint } = this.getContext(req);
        const now = Date.now();

        if (nextRequestAt[ipAddress] && now < nextRequestAt[ipAddress]) {
            context.log(`${ipAddress} is banned for ${nextRequestAt[ipAddress] - now} more milliseconds`);
            return false;
        }

        if (!log[ipAddress]) log[ipAddress] = [];
        if (!violations[ipAddress]) violations[ipAddress] = [];

        // Remove all entries older than MAX_INTERVAL
        log[ipAddress] = log[ipAddress].filter(timestamp => now - timestamp < CONSTRAINTS.MAX_INTERVAL);
        violations[ipAddress] = violations[ipAddress].filter(timestamp => now - timestamp < CONSTRAINTS.MAX_INTERVAL);

        const check: any = {};
        const intervals = Object.keys(CONSTRAINTS.INTERVALS);
        for (let interval of intervals) {
            check[interval] = 0;
        }
        for (let timestamp of log[ipAddress]) {
            for (let key of intervals) {
                let interval = parseInt(key);
                if (now - timestamp < interval) {
                    check[interval] = (check[interval] || 0) + 1;
                }
            }
        }

        let reject = false;
        let banned = false;
        let reason = "";
        for (let interval of intervals) {
            let count = check[interval];
            let max = CONSTRAINTS.INTERVALS[interval];
            if (count >= max) {
                reason = `${count} calls in ${interval} milliseconds`;
                context.log(`Rejecting the call from ${ipAddress} for ${reason}`);
                violations[ipAddress].push(now);
                reject = true;
                break;
            }
        }

        log[ipAddress].push(now);

        if (violations[ipAddress].length >= 3) {
            context.log(`Banning ${ipAddress} for ${CONSTRAINTS.BAN_DURATION} milliseconds`);
            reason += `. Banned for ${CONSTRAINTS.BAN_DURATION} milliseconds`;
            violations[ipAddress] = [];
            log[ipAddress] = [];
            nextRequestAt[ipAddress] = now + CONSTRAINTS.BAN_DURATION;
            banned = true;
        }

        if (reject && typeof rejectCallback === "function") {
            rejectCallback(req.method, endpoint, ipAddress, reason);
        }
        return !reject;
    }
};
