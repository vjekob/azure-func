import { RequestContext } from "./RequestContext";

export interface HandlerFunc<TRequest, TResponse, TBindings> {
    (context: RequestContext<TRequest, TBindings>): Promise<TResponse>;
}
