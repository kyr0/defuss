// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { rule, Rules, transval } from "./api.js";
import type { FieldValidationMessage } from "./types.js";
import { stripSourceInfo } from "./test-utils.js";

describe("JSX error rendering - Field-specific scenarios", () => {
  it("should format field-specific errors with path parameter", async () => {
    class FieldValidators extends Rules {
      required() {
        return ((value: any) =>
          !value ? "Field is required" : true) as unknown as Rules & this;
      }

      email() {
        return ((value: string) => {
          if (typeof value === "string" && !value.includes("@")) {
            return "Invalid email format";
          }
          return true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(FieldValidators);
    const validator = transval(
      myValidate("user.name").required(),
      myValidate("user.email").required().email(),
      myValidate("user.age").required(),
    );

    const result = await validator.isValid({
      user: { name: "", email: "invalid-email", age: null },
    });
    expect(result).toBe(false);

    // Test formatting specific field errors
    expect(
      stripSourceInfo(
        validator.getMessages(
          "user.email",
          (messages: FieldValidationMessage[]) => (
            <div className="field-error" data-field="email">
              <span className="field-label">Email:</span>
              {messages.map((msg: FieldValidationMessage) => (
                <span key={msg.message} className="error-text">
                  {` ${msg.message}`}
                </span>
              ))}
            </div>
          ),
        ),
      ),
    ).toEqual(
      stripSourceInfo(
        <div className="field-error" data-field="email">
          <span className="field-label">Email:</span>
          <span key="Invalid email format" className="error-text">
            {" Invalid email format"}
          </span>
        </div>,
      ),
    );

    // Test that we can format different fields differently
    expect(
      stripSourceInfo(
        validator.getMessages(
          "user.name",
          (messages: FieldValidationMessage[]) => (
            <div className="field-error" data-field="name">
              <span className="field-label">Name:</span>
              <strong className="required-error">
                {messages[0]?.message}
              </strong>
            </div>
          ),
        ),
      ),
    ).toEqual(
      stripSourceInfo(
        <div className="field-error" data-field="name">
          <span className="field-label">Name:</span>
          <strong className="required-error">Field is required</strong>
        </div>,
      ),
    );
  });
});
