import { Context, HttpMethod, HttpRequest } from "@azure/functions";
import { RequestBinder } from "./RequestBinder";

export class RequestContext<TRequest, TBindings> {
    private _context: Context;
    private _req: HttpRequest;
    private _binder: RequestBinder;
    private _bindings: TBindings = {} as TBindings;
    private _bound: boolean = false;

    constructor(context: Context, req: HttpRequest, binder: RequestBinder) {
        this._context = context;
        this._binder = binder;
        this._req = req;
    }

    public get method(): HttpMethod {
        return this._req.method as HttpMethod;
    }

    public get rawContext() {
        return this._context;
    }

    public get bindings() {
        return this._bindings;
    }

    public async bind(): Promise<void> {
        if (this._bound) {
            return;
        }

        this._bindings = await this._binder.getBindings(this._context, this._req);
        this._bound = true;
    }

    public get body(): TRequest {
        return this._context.req?.body as TRequest;
    }
}
