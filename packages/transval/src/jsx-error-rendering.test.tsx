// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderIsomorphicSync, type Globals, type RenderInput } from "defuss";
import { rule, Rules, transval } from "./api.js";
import { getBrowserGlobals } from "defuss/server";

describe("JSX error rendering", () => {
  let globals: Globals;
  beforeEach(() => {
    globals = getBrowserGlobals();
  });

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

    const validator = myValidate("name")
      .customMessage("Name is required")
      .useFormatter((messages) => {
        return (
          <>
            {messages.map((msg) => (
              <div className="error-message">{msg}</div>
            ))}
          </>
        );
      });

    const invalidFormData = {
      name: "",
    };

    const result = await validator.isValid(invalidFormData);
    expect(result).toBe(false);

    expect(validator.getFormattedMessages()).toEqual([
      <div className="error-message">Name is required</div>,
    ]);
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

    const chains = [
      myValidate("name")
        .customMessage("Name is required")
        .useFormatter((messages) => (
          <ul className="error-list">
            {messages.map((msg) => (
              <li className="error-item">{msg}</li>
            ))}
          </ul>
        )),
      myValidate("age").customMessage("Age is required"),
    ];

    const validator = transval(chains);

    const invalidFormData = {
      name: "",
      age: null,
    };

    const result = await validator.isValid(invalidFormData);
    expect(result).toBe(false);

    expect(validator.getFormattedMessages()).toEqual(
      <ul className="error-list">
        <li className="error-item">Name is required</li>
      </ul>,
    );
  });
});
