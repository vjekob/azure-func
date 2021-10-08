export interface RejectionCallback {
    (method: string | null, endpoint: string, ipAddress: string, reason: string): void;
}
