import { RequestContext } from './RequestContext';

export interface AuthorizationCallback<TRequest, TBindings> {
    (request: RequestContext<TRequest, TBindings>): Promise<boolean>;
}
