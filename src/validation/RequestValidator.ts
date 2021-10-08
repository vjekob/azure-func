import { HttpRequest } from "@azure/functions";
import { ExpectTemplate } from "./ExpectTemplate";
import { ValidationTarget, ValidationTargets } from "./ValidationTarget";
import { ValidatorFunc } from "./ValidatorFunc";

const TypeValidator: { [key: string]: ValidatorFunc } = {
    "string": (value: any) => typeof value === "string" || `string expected, received "${typeof value}"`,
    "number": (value: any) => typeof value === "number" || `number expected, received "${typeof value}"`,
    "boolean": (value: any) => typeof value === "boolean" || `boolean expected, received"${typeof value}""`,
    "PositiveNumber": (value: any) => typeof value === "number" && value && value >= 1 || `non-zero number expected, received ${value}`,
    "defined": (value: any) => typeof value !== "undefined" || `value is not defined`,
}

let VALID_TYPES = Object.keys(TypeValidator);

export class RequestValidator {
    private _expectTemplates: { [key in ValidationTarget]?: ExpectTemplate[] } = {};

    public static defineValidator(key: string, validator: ValidatorFunc) {
        TypeValidator[key] = validator;
        VALID_TYPES = Object.keys(TypeValidator);
    }

    private validateTarget(target: any, template: ExpectTemplate): void {
        for (let propertyExpected of Object.keys(template)) {
            let property = propertyExpected;
            let optional = false;
            if (propertyExpected.endsWith("?")) {
                optional = true;
                property = propertyExpected.substr(0, propertyExpected.length - 1);
            }

            if (!target.hasOwnProperty(property)) {
                if (optional) {
                    continue;
                }
                throw new Error(`Request does not contain property "${property}"`);
            }

            let expectedType = template[propertyExpected];
            let values = target[property];
            if (expectedType.endsWith("[]")) {
                if (!Array.isArray(values)) {
                    throw new Error(`Property "${property}" must be an array`);
                }
                expectedType = expectedType.substr(0, expectedType.length - 2);
            } else {
                values = [values];
            }

            for (let value of values) {
                let result = TypeValidator[expectedType](value);
                if (result !== true) {
                    throw new Error(`Validation failed for "${property}": ${result}`);
                }
            }
        }
    }

    public validate(req: HttpRequest): void {
        for (let target of ValidationTargets) {
            const templates = this._expectTemplates[target];
            if (!templates) {
                continue;
            }
            for (let template of templates) {
                this.validateTarget(req[target] || {}, template);
            }
        }
    }

    public expect(target: ValidationTarget, template: ExpectTemplate) {
        if (typeof template !== "object" || !template) {
            throw new Error("Validator expect template must be an object.");
        }
        for (let key of Object.keys(template)) {
            let type = template[key];
            if (type.endsWith("[]")) {
                type = type.substr(0, type.length - 2);
            }
            if (!VALID_TYPES.includes(type)) {
                throw new Error(`Validator expect template specifies incorrect type for property "${key}": ${type}. Valid types are: ${VALID_TYPES}`)
            }
        }
        this._expectTemplates[target] = [...(this._expectTemplates[target] || []), template];
    }
}
