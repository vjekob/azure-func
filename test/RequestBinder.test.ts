import { ErrorResponse } from "../src/request/ErrorResponse";
import { RequestHandler } from "../src/request/RequestHandler";
import { Mock } from "@vjeko.com/azure-func-test";
import * as azure from "azure-storage";

jest.mock("azure-storage");
Mock.initializeStorage(azure.createBlobService);

describe("Testing v2 RequestBinder", () => {
    const s1 = "__test__1__", s2 = "__test__2__", s3 = "__test__3__";
    const handler = new RequestHandler(async (req) => {
        if (req.bindings && req.bindings.appId === s1 && req.bindings.test === s2 && req.bindings.consumption === s3) return { success: true };
        throw new ErrorResponse("Bindings not valid", 418);
    });

    handler.bind("{appId}.json").to("appId");
    handler.bind("{test}").to("test");
    handler.bind("{appId}/{id}/consumption/{type}_data.json").to("consumption");

    it("Fails on all incorrect bindings", async () => {
        Mock.useStorage({});
        const request = new Mock.Request("GET", {
            appId: "__mock__",
            test: "__fake__",
            type: "codeunit",
            id: "1000"
        });     
        const context = new Mock.Context(request);
        await handler.azureFunction(context, request);
        expect(context.res.status).toEqual(418);
    });

    it("Fails on single incorrect binding", async () => {
        const storage = {
            "__mock__.json": s1,
            "__fake__": s2,
            "__mock__/1000/consumption/codeunit_data.json": s3,
        };
        Mock.useStorage(storage);

        const request = new Mock.Request("GET", {
            appId: "__mock__",
            test: "__fake__",
            type: "codeunit",
            id: "1001"
        });     
        const context = new Mock.Context(request);
        await handler.azureFunction(context, request);
        expect(context.res.status).toEqual(418);
    });

    it("Makes sure bound data is available to request handler", async () => {
        const storage = {
            "__mock__.json": s1,
            "__fake__": s2,
            "__mock__/1000/consumption/codeunit_data.json": s3,
        };
        Mock.useStorage(storage);

        const request = new Mock.Request("GET", {
            appId: "__mock__",
            test: "__fake__",
            type: "codeunit",
            id: "1000"
        });     
        const context = new Mock.Context(request);
        await handler.azureFunction(context, request);
        expect(context.res.status).toEqual(200);
        expect(context.res.body).toBeDefined();
        expect(context.res.body.success).toStrictEqual(true);
    });

    it("Fails when bound property is not found in body or query string", async () => {
        const storage = {
            "__mock__.json": s1,
            "__fake__": s2,
            "__mock__/1000/consumption/codeunit_data.json": s3,
        };
        Mock.useStorage(storage);
        const request = new Mock.Request("GET", {
            appId: "__mock__",
            test: "__fake__",
            id: "1000"
        });     
        const context = new Mock.Context(request);
        await handler.azureFunction(context, request);
        expect(context.res.status).toEqual(418);
    });

    it("Succeeds when bound property is found in either body or query string", async () => {
        const storage = {
            "__mock__.json": s1,
            "__fake__": s2,
            "__mock__/1000/consumption/codeunit_data.json": s3,
        };
        Mock.useStorage(storage);
        const request = new Mock.Request("GET", {
            appId: "__mock__",
            id: "1000"
        }, {
            test: "__fake__",
            type: "codeunit",
        });     
        const context = new Mock.Context(request);
        await handler.azureFunction(context, request);
        expect(context.res.status).toEqual(200);
    });

});
