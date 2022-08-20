import { Blob } from "./../src/Blob";
import { Mock } from "@vjeko.com/azure-func-test";
import * as azure from "azure-storage";

jest.mock("azure-storage");
Mock.initializeStorage(azure.createBlobService);

describe("Testing Blob mock functionality (necessary for correctness of other tests)", () => {
    test("Exists returns true when blob exists", async () => {
        let name = "__mock__";
        Mock.useStorage({ [name]: {} });
        const blob = new Blob(name);
        expect(await blob.exists()).toBe(true);
    });

    test("Exists returns false when blob does not exist", async () => {
        let name = "__mock__";
        Mock.useStorage({});
        const blob = new Blob(name);
        expect(await blob.exists()).toBe(false);
    });

    it("Successfully reads from an existing blob", async () => {
        let name = "__mock__";
        Mock.useStorage({ [name]: { hello: "World" } });
        const blob = new Blob(name);
        let result: any = await blob.read();
        expect(result).toBeDefined();
        expect(result.hello).toBe("World");
    });

    it("Reads null from a non-existent blob", async () => {
        let name = "__mock__";
        Mock.useStorage({});
        const blob = new Blob(name);
        let result: any = await blob.read();
        expect(result).toStrictEqual(null);
    });

    it("Reads empty object from a non-existent blob when ignoreError is set", async () => {
        let name = "__mock__";
        Mock.useStorage({});
        const blob = new Blob(name);
        let result: any = await blob.read(true);
        expect(result).toEqual({});
    });

    it("Successfully deletes an existing blob", async () => {
        let name = "__mock__";
        let storage = { [name]: { hello: "World" } };
        Mock.useStorage(storage);
        const blob = new Blob(name);
        let result = await blob.delete();
        expect(result).toStrictEqual(true);
        expect(storage).toEqual({});
    });

    it("Returns false when deleting a non-existent blob", async () => {
        let name = "__mock__";
        let nonExistentName = "__fake__";
        let storage = { [name]: { hello: "World" } };
        Mock.useStorage(storage);
        const blob = new Blob(nonExistentName);
        let result = await blob.delete();
        expect(result).toStrictEqual(false);
        expect(storage).toEqual({ ...storage });
    });

    it("Updates contents of blob", async () => {
        let name = "__mock__";
        let storage = { [name]: { hello: "World" } };
        Mock.useStorage(storage);
        const blob = new Blob(name);
        await blob.optimisticUpdate((data: any) => ({ ...data, hello: `${data.hello.toUpperCase()}!`, bye: "Moon" }));
        expect(storage[name].hello).toBe("WORLD!");
        expect((storage[name] as any).bye).toBe("Moon");
    });

    it("Successfully updates contents of blob in multi-request concurrent process", async () => {
        let name = "__mock__";
        let storage = { [name]: [] };
        Mock.useStorage(storage);

        let maxAttempts = 0;
        const getPromise = async (id: number) => {
            const blob = new Blob<number[]>(name);
            await blob.optimisticUpdate((data: number[], attempts) => {
                if (attempts > maxAttempts) {
                    maxAttempts = attempts;;
                }
                return [...data, id];
            });
        };

        let promises: Promise<any>[] = [];
        for (let i = 0; i < 50; i++) {
            promises.push(getPromise(i));
        }
        await Promise.all(promises);

        expect(maxAttempts).toBeGreaterThan(1);
        for (let i = 0; i < 50; i++) {
            let slice = storage[name] as number[];
            expect(slice.includes(i)).toStrictEqual(true);
        }
    });

    it("Locks an unlocked blob and then unlocks it", async () => {
        let name = "__mock__";
        let storage = { [name]: { hello: "World" } };
        Mock.useStorage(storage);
        const blob = new Blob(name);
        let locked = await blob.lock();
        let unlocked = await blob.unlock();
        expect(locked).toStrictEqual(true);
        expect(unlocked).toStrictEqual(true);
    });

    it("Fails locking a non-existent blob", async () => {
        let name = "__mock__";
        let storage = {};
        Mock.useStorage(storage);
        const blob = new Blob(name);
        let locked = await blob.lock();
        let unlocked = await blob.unlock();
        expect(locked).toStrictEqual(false);
        expect(unlocked).toStrictEqual(false);
    });

    it("Fails locking an already locked blob", async () => {
        let name = "__mock__";
        let storage = { [name]: { hello: "World" } };
        Mock.useStorage(storage);

        const blob1 = new Blob(name);
        let locked1 = await blob1.lock();

        const blob2 = new Blob(name);
        let locked2 = await blob2.lock();

        let unlocked1 = await blob1.unlock();
        let unlocked2 = await blob2.unlock();

        expect(locked1).toStrictEqual(true);
        expect(locked2).toStrictEqual(false);
        expect(unlocked1).toStrictEqual(true);
        expect(unlocked2).toStrictEqual(false);
    });

    it("Fails deleting a locked blob", async () => {
        let name = "__mock__";
        let storage = { [name]: { hello: "World" } };
        Mock.useStorage(storage);

        const blob1 = new Blob(name);
        let locked1 = await blob1.lock();

        const blob2 = new Blob(name);
        let deleted2 = await blob2.delete();

        let unlocked1 = await blob1.unlock();

        expect(locked1).toStrictEqual(true);
        expect(unlocked1).toStrictEqual(true);
        expect(deleted2).toStrictEqual(false);
        expect(storage[name]).toBeDefined();
    });

    it("Successfully deletes a locked blob from within locked blob object", async () => {
        let name = "__mock__";
        let storage = { [name]: { hello: "World" } };
        Mock.useStorage(storage);

        const blob = new Blob(name);
        let locked = await blob.lock();
        let deleted = await blob.delete();
        let unlocked = await blob.unlock();

        expect(locked).toStrictEqual(true);
        expect(deleted).toStrictEqual(true);
        expect(unlocked).toStrictEqual(false);
        expect(storage[name]).toBeUndefined();
    });

    it("Successfully deletes a freshly unlocked blob", async () => {
        let name = "__mock__";
        let storage = { [name]: { hello: "World" } };
        Mock.useStorage(storage);

        const blob1 = new Blob(name);
        let locked1 = await blob1.lock();
        let unlocked1 = await blob1.unlock();

        const blob2 = new Blob(name);
        let deleted2 = await blob2.delete();

        expect(locked1).toStrictEqual(true);
        expect(unlocked1).toStrictEqual(true);
        expect(deleted2).toStrictEqual(true);
        expect(storage[name]).toBeUndefined();
    });

    it("Exposes public path and container properties", async () => {
        let name = "__mock__";
        let container = "__container__";

        const blob = new Blob(name, container);

        expect(blob.path).toBe(name);
        expect(blob.container).toBe(container);
    });

});
