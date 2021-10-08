import { HttpMethod, HttpRequest, HttpRequestHeaders, HttpRequestParams, HttpRequestQuery } from "@azure/functions";

export interface Request<
    TBody extends any = any,
    TQuery extends HttpRequestQuery = HttpRequestQuery,
    THeaders extends HttpRequestHeaders = HttpRequestHeaders
> extends HttpRequest {
    method: HttpMethod;
    body?: TBody;
    query: TQuery;
    headers: THeaders;
}
