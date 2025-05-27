// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { rule, Rules, transval } from "./api.js";

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
      validator.getMessages(undefined, (messages: string[]) =>
        messages.map((msg: string) => (
          <div className="error-message">{msg}</div>
        )),
      ),
    ).toEqual([<div className="error-message">Name is required</div>]);
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
      validator.getMessages(undefined, (messages: string[]) => (
        <ul className="error-list">
          {messages.map((msg: string) => (
            <li className="error-item">{msg}</li>
          ))}
        </ul>
      )),
    ).toEqual(
      <ul className="error-list">
        <li className="error-item">Name is required</li>
        <li className="error-item">Age is required</li>
      </ul>,
    );
  });
});
