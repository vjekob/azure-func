import { ErrorResponse } from "../src/request/ErrorResponse";
import { RequestHandler } from "../src/request/RequestHandler";
import { Mock } from "@vjeko.com/azure-func-test";

interface MockAuthorization {
    appId: string;
    authKey: string;
}

async function invokeHandler(body: any, auth?: MockAuthorization) {
    const handler = new RequestHandler(async () => { });
    handler.validator.expect("body", {
        appId: "string",
        "authKey?": "string"
    });
    if (auth) {
        handler.onAuthorization(async (authBody) => authBody.body.appId === auth.appId && authBody.body.authKey === auth.authKey);
    }
    const context = new Mock.Context(new Mock.Request("GET", body));
    await handler.azureFunction(context, context.req);
    return context.res;
}

describe("Testing v2 RequestHandler", () => {
    const mockAuth: MockAuthorization = {
        appId: `${Date.now()}.${Math.random() * 10000000}`,
        authKey: `${Math.random() * 10000000}`
    };    

    it("Fails on validating an invalid request", async () => {
        const response = await invokeHandler({});
        expect(response.status).toBe(400);
    });

    it("Succeeds on validating a valid request", async () => {
        const response = await invokeHandler({ appId: "1" });
        expect(response.status).toBe(200);
    });

    it("Fails on invalid authorization", async () => {
        const response = await invokeHandler({ appId: mockAuth.appId }, mockAuth);
        expect(response.status).toBe(401);
    });

    it("Succeeds on valid authorization", async () => {
        const response = await invokeHandler({ ...mockAuth }, mockAuth);
        expect(response.status).toBe(200);
    });

    it("Responds with headers on 503 Service Unavailable", async () => {
        const message = "Scheduled maintenance";
        const handler = new RequestHandler(async () => {
            throw new ErrorResponse(message, 503, { "retry-after": "3600" });
        });
        const context = new Mock.Context(new Mock.Request("GET", { appId: "_mock_" }));
        await handler.azureFunction(context, context.req);
        const response = context.res;

        expect(response.status).toBe(503);
        expect(response.headers["retry-after"]).toBe("3600");
    });
});
