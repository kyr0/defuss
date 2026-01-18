// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { rule, Rules, transval } from "./api.js";
import type { FieldValidationMessage } from "./types.js";
import { stripSourceInfo } from "./test-utils.js";

describe("JSX error rendering - Basic scenarios", () => {
  it("should format validation errors as JSX elements", async () => {
    class MessageValidators extends Rules {
      customMessage(message: string) {
        return ((value: any) => {
          if (!value) {
            return message;
          }
          return true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(MessageValidators);

    const validator = transval([
      myValidate("name").customMessage("Name is required"),
    ]);

    const invalidFormData = {
      name: "",
    };

    const result = await validator.isValid(invalidFormData);
    expect(result).toBe(false);

    expect(
      stripSourceInfo(
        validator.getMessages(undefined, (messages: FieldValidationMessage[]) =>
          messages.map((msg: FieldValidationMessage) => (
            <div className="error-message">{msg.message}</div>
          )),
        ),
      ),
    ).toEqual(
      stripSourceInfo([<div className="error-message">Name is required</div>]),
    );
  });

  it("should format multiple validation errors as JSX list", async () => {
    class MessageValidators extends Rules {
      customMessage(message: string) {
        return ((value: any) => {
          if (!value) {
            return message;
          }
          return true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(MessageValidators);
    const validator = transval(
      myValidate("name").customMessage("Name is required"),
      myValidate("age").customMessage("Age is required"),
    );

    const invalidFormData = {
      name: "",
      age: null,
    };

    const result = await validator.isValid(invalidFormData);
    expect(result).toBe(false);

    expect(
      stripSourceInfo(
        validator.getMessages(
          undefined,
          (messages: FieldValidationMessage[]) => (
            <ul className="error-list">
              {messages.map((msg: FieldValidationMessage) => (
                <li className="error-item">{msg.message}</li>
              ))}
            </ul>
          ),
        ),
      ),
    ).toEqual(
      stripSourceInfo(
        <ul className="error-list">
          <li className="error-item">Name is required</li>
          <li className="error-item">Age is required</li>
        </ul>,
      ),
    );
  });
});
