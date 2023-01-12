import { RequestContext } from "./RequestContext";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { RateLimiter } from "./../rateLimit/RateLimiter";
import { ErrorResponse } from "./ErrorResponse";
import { RequestValidator } from "./../validation/RequestValidator";
import { PropertyBinder, RequestBinder } from "./RequestBinder";
import { RejectionCallback } from "./../rateLimit/RejectionCallback";
import { AuthorizationCallback } from "./AuthorizationCallback";
import { HandlerFunc } from "./HandlerFunc";
import { BLOB_TIMEOUT_TOKEN } from "../Blob";

export class RequestHandler<TRequest = any, TResponse = any, TBindings = any> {
    private _handler: HandlerFunc<TRequest, TResponse, TBindings>;
    private _validator = new RequestValidator();
    private _binder = new RequestBinder();
    private _onTooManyRequests?: RejectionCallback;
    private _onAuthorization?: AuthorizationCallback<TRequest, TBindings>;
    private _noRateLimit = false;

    public constructor(handler: HandlerFunc<TRequest, TResponse, TBindings>) {
        this._handler = handler;
    }

    private respondError(context: Context, errorMessage: string, status: number = 500): void {
        context.res = {
            status,
            body: {
                errorMessage
            }
        }
    }

    private respondBadRequest(context: Context, errorMessage?: string): void {
        this.respondError(context, errorMessage || "Bad request format", 400);
    }

    private respondUnauthorized(context: Context): void {
        this.respondError(context, "Invalid credentials", 401);
    }

    private respondTimeout(context: Context, errorMessage?: string): void {
        this.respondError(context, errorMessage || "Request has timed out", 408);
    }

    private respondTooManyRequests(context: Context): void {
        this.respondError(context, "Chill down, will you please?", 429);
    }

    private respondServerError(context: Context, body: any): void {
        this.respondError(context, body || "An unhandled error with an unknown error message has occurred. This is most likely a bug in code.", 500);
    }

    private async authorize(request: RequestContext<TRequest, TBindings>): Promise<boolean> {
        if (typeof this._onAuthorization === "function" && !(await this._onAuthorization(request))) {
            this.respondUnauthorized(request.rawContext);
            return false;
        }
        return true;
    }

    private validate(context: Context, body: any): boolean {
        try {
            this._validator.validate(body);
            return true;
        }
        catch (e: any) {
            this.respondBadRequest(context, e && e.message);
            return false;
        }
    }

    private async handleHttpRequest(context: Context, req: HttpRequest): Promise<void> {
        if (!this._noRateLimit && !RateLimiter.accept(req, context, this._onTooManyRequests)) {
            return this.respondTooManyRequests(context);
        }

        let request = new RequestContext<TRequest, TBindings>(context, req, this._binder);

        if (!await this.authorize(request)) {
            return;
        }

        if (!this.validate(context, req)) {
            return;
        }

        const body = req.body || {};

        try {
            await request.bind();
            const handleResult = await this._handler(request);
            const headers = typeof handleResult === "object" ? {
                "Content-Type": "application/json",
            } : undefined;
            context.res = {
                status: 200,
                body: handleResult,
                headers
            };
        } catch (e: any) {
            if (e === BLOB_TIMEOUT_TOKEN) {
                return this.respondTimeout(context, "Blob operation has timed out.");
            }
            if (e instanceof ErrorResponse) {
                context.res = { ...e };
                return;
            }
            return this.respondServerError(context, e && e.message || `${e}`);
        }
    }

    public bind(blob: string, container?: string): PropertyBinder {
        return this._binder.getPropertyBinder(blob, container);
    }

    public noRateLimit() {
        this._noRateLimit = true;
    }

    public get validator() {
        return this._validator;
    }

    public onTooManyRequests(value: RejectionCallback) {
        this._onTooManyRequests = value;
    }

    public onAuthorization(value: AuthorizationCallback<TRequest, TBindings>) {
        this._onAuthorization = value;
    }

    public get azureFunction(): AzureFunction {
        return this.handleHttpRequest.bind(this);
    }
}
