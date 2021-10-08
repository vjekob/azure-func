export class ErrorResponse {
    public body: any;
    public status: number;
    public headers: { [key: string]: string } = {};

    constructor(body: any, status: number = 400, headers: { [key: string]: string } = {}) {
        this.body = body || "An unspecified error has occurred";
        this.status = status;
        this.headers = headers;
    }
}
