import { RequestHandler } from "../src/request/RequestHandler";
import { Mock } from "@vjeko.com/azure-func-test";
import * as azure from "azure-storage";
import { Blob } from "../src/Blob";
import { MockRequest } from "@vjeko.com/azure-func-test/dist/MockRequest";

jest.mock("azure-storage");
Mock.initializeStorage(azure.createBlobService);

describe("Testing RequestHandler with Blob operations", () => {
    // This test is mostly relevant for testability.
    // It tests against conditions that can sometimes happen during testability.
    it("Gracefully cleans up after a blob failure at invocation of service.* methods when service is undefined", async () => {
        const handler = new RequestHandler(async (req) => {
            const blob = new Blob("test");
            await blob.optimisticUpdate(async () => {
                return { success: true };
            });
        });

        const context = new Mock.Context(new Mock.Request("POST"));
        await handler.azureFunction(context, context.req);
        expect(context.res.status).toBe(500);
    });

    it("Succeeds when Blob operation is faster than timeout", async () => {
        const storage: any = {};
        const key = "test.json";
        Mock.useStorage(storage);
        const handler = new RequestHandler(async (req) => {
            const blob = new Blob(key);
            await blob.optimisticUpdate(async () => {
                await new Promise(resolve => setTimeout(resolve));
                return { success: true };
            }, 100);
        });
        const context = new Mock.Context(new MockRequest("GET"));
        await handler.azureFunction(context, context.req);
        expect(context.res.status).toEqual(200);
        expect(storage[key]).toEqual({ success: true });
    });

    it("Fails on timeout", async () => {
        const storage: any = {};
        const key = "test.json";
        Mock.useStorage(storage);
        const handler = new RequestHandler(async (req) => {
            const blob = new Blob(key);
            await blob.optimisticUpdate(async () => {
                await new Promise(resolve => setTimeout(resolve, 25));
                return {};
            }, 1);
        });
        const context = new Mock.Context(new MockRequest("GET"));
        await handler.azureFunction(context, context.req);
        expect(context.res.status).toEqual(408);
        expect(storage[key]).toBeUndefined();
    });
});
