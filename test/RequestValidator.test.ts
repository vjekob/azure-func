import { RequestValidator } from "../src/validation/RequestValidator";
import { HttpRequest } from "@azure/functions";
import { Mock } from "@vjeko.com/azure-func-test";

describe("Testing v2 RequestValidator", () => {
    RequestValidator.defineValidator("Custom", (value) => ["first", "second", "third"].includes(value) || `invalid value: ${value}`);

    it("Succeeds on unspecified validation rules", async () => {
        const validator = new RequestValidator();
        expect(() => validator.validate({} as HttpRequest)).not.toThrowError();
    });

    it("Succeeds on empty validation rules", async () => {
        const validator = new RequestValidator();
        validator.expect("body", {});
        expect(() => validator.validate({} as HttpRequest)).not.toThrowError();
    });

    it("Fails on invalid number", async () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number": "number" });
        const request = new Mock.Request("GET", { "number": "not a number" });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Succeeds on valid number", async () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number": "number" });
        const request = new Mock.Request("GET", { "number": 3.14 });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Fails on number[] instead of number", async () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number": "number" });
        const request = new Mock.Request("GET", { "number": [3.14] });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Fails on invalid number[]", async () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number": "number[]" });
        const request = new Mock.Request("GET", { "number": 3.14 });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Succeeds on valid number[]", async () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number": "number[]" });
        const request = new Mock.Request("GET", { "number": [3.14] });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Succeeds on valid number[?], with actual array passed in", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number": "number[?]" });
        const request = new Mock.Request("GET", { "number": [3.14, 4.25, 5.36] });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Succeeds on valid number[?], with number passed in", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number": "number[?]" });
        const request = new Mock.Request("GET", { "number": 3.14 });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Fails on invalid number[?], with actual array passed in", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number": "number[?]" });
        const request = new Mock.Request("GET", { "number": ["apple"] });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Fails on invalid number[?], with number passed in", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number": "number[?]" });
        const request = new Mock.Request("GET", { "number": "apple" });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Fails on invalid PositiveNumber", async () => {
        const validator = new RequestValidator();
        validator.expect("body", { "PositiveNumber": "PositiveNumber" });
        const request = new Mock.Request("GET", { "PositiveNumber": 0 });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Succeeds on valid PositiveNumber", async () => {
        const validator = new RequestValidator();
        validator.expect("body", { "PositiveNumber": "PositiveNumber" });
        const request = new Mock.Request("GET", { "PositiveNumber": 3.14 });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Fails on invalid PositiveNumber[]", async () => {
        const validator = new RequestValidator();
        validator.expect("body", { "PositiveNumber": "PositiveNumber[]" });
        const request = new Mock.Request("GET", { "PositiveNumber": 3.14 });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Succeeds on valid PositiveNumber[]", async () => {
        const validator = new RequestValidator();
        validator.expect("body", { "PositiveNumber": "PositiveNumber[]" });
        const request = new Mock.Request("GET", { "PositiveNumber": [3.14] });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Fails on undefined header", async () => {
        const validator = new RequestValidator();
        validator.expect("headers", { "x-test": "defined" });
        const request = new Mock.Request("GET");
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Succeeds on defined header", async () => {
        const validator = new RequestValidator();
        validator.expect("headers", { "x-test": "defined" });
        const request = new Mock.Request("GET");
        request.setHeader("x-test", "something");
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Fails on undefined query", async () => {
        const validator = new RequestValidator();
        validator.expect("query", { "test": "defined" });
        const request = new Mock.Request("GET");
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Succeeds on defined query", async () => {
        const validator = new RequestValidator();
        validator.expect("query", { "test": "defined" });
        const request = new Mock.Request("GET");
        request.setQuery("test", "something");
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Fails on multiple expects", async () => {
        const validator = new RequestValidator();
        validator.expect("query", { "test": "defined" });
        validator.expect("headers", { "x-test": "defined" });
        validator.expect("body", { "number": "number", "strings": "string[]" });
        const request = new Mock.Request("GET", { number: 1, strings: [] }, { "Test": "wrong"}, { "x-test-old": "definition" });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Succeeds on multiple expects", async () => {
        const validator = new RequestValidator();
        validator.expect("query", { "test": "defined" });
        validator.expect("headers", { "x-test": "defined" });
        validator.expect("body", { "number": "number", "strings": "string[]" });
        const request = new Mock.Request("GET", { number: 1, strings: [] }, { "test": "correct"}, { "x-test": "definition" });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Fails on invalid custom type", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "test": "Custom" });
        const request = new Mock.Request("GET", { "test": "fourth" });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Succeeds on valid custom type", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "test": "Custom" });
        const request = new Mock.Request("GET", { "test": "second" });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Fails on invalid custom array type", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "test": "Custom[]" });
        const request = new Mock.Request("GET", { "test": "third" });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Succeeds on valid custom array type", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "test": "Custom[]" });
        const request = new Mock.Request("GET", { "test": ["third"] });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Succeeds on valid custom optional array type, with actual array passed in", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "test": "Custom[?]" });
        const request = new Mock.Request("GET", { "test": ["first", "second", "third"] });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Succeeds on valid custom optional array type, with non-array passed in", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "test": "Custom[?]" });
        const request = new Mock.Request("GET", { "test": "third" });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Fails on invalid custom optional array type, with actual array passed in", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "test": "Custom[?]" });
        const request = new Mock.Request("GET", { "test": ["fourth"] });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Fails on invalid custom optional array type, with non-array passed in", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "test": "Custom[?]" });
        const request = new Mock.Request("GET", { "test": "fourth" });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Succeeds on optional absence", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number?": "number" });
        const request = new Mock.Request("GET");
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Fails on optional present with invalid type", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number?": "number" });
        const request = new Mock.Request("GET", { "number": "string" });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Succeeds on optional presence with valid type", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number?": "number" });
        const request = new Mock.Request("GET", { "number": 3.14 });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Succeeds on optional array absence", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number?": "number[]" });
        const request = new Mock.Request("GET");
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Succeeds on optional array presence", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number?": "number[]" });
        const request = new Mock.Request("GET", { "number": [3.14] });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Fails on undefined value", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "string": "string" });
        const request = new Mock.Request("GET", { "string": undefined });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Fails on multi-element array with incorrect types", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number": "number[]" });
        const request = new Mock.Request("GET", { "number": [3.14, "apple"] });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Succeeds on multi-element array with correct types", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number": "number[]" });
        const request = new Mock.Request("GET", { "number": [3.14, 1] });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Succeeds on multi-expect with valid request", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number": "number" });
        validator.expect("body", { "string": "string" })
        const request = new Mock.Request("GET", { "number": 3.14, "string": "pi" });
        expect(() => validator.validate(request)).not.toThrowError();
    });

    it("Fails on multi-expect with invalid request (first valid, second invalid)", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number": "number" });
        validator.expect("body", { "string": "string" })
        const request = new Mock.Request("GET", { "number": 3.14, "string": 3.14 });
        expect(() => validator.validate(request)).toThrowError();
    });

    it("Fails on multi-expect with invalid request (first invalid, second valid)", () => {
        const validator = new RequestValidator();
        validator.expect("body", { "number": "number" });
        validator.expect("body", { "string": "string" })
        const request = new Mock.Request("GET", { "number": "3.14", "string": "pi" });
        expect(() => validator.validate(request)).toThrowError();
    });
});
