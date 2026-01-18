// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { rule, Rules, transval } from "./api.js";
import type { FieldValidationMessage } from "./types.js";
import type { RenderInput } from "defuss/jsx-runtime";
import { stripSourceInfo } from "./test-utils.js";

describe("JSX error rendering - Multi-error scenarios", () => {
  it("should format multiple errors per field as JSX", async () => {
    class MultiErrorValidators extends Rules {
      complexValidation() {
        return ((value: any) => {
          const errors: string[] = [];

          if (!value) {
            errors.push("Field is required");
          } else if (typeof value === "string") {
            if (value.length < 5) errors.push("Must be at least 5 characters");
            if (!/[A-Z]/.test(value))
              errors.push("Must contain uppercase letter");
            if (!/[0-9]/.test(value)) errors.push("Must contain a number");
          }

          return errors.length > 0 ? errors : true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(MultiErrorValidators);
    const validator = transval(myValidate("password").complexValidation());

    const result = await validator.isValid({ password: "abc" });
    expect(result).toBe(false);

    // Test formatting multiple errors as nested JSX
    expect(
      stripSourceInfo(
        validator.getMessages(
          undefined,
          (messages: FieldValidationMessage[]) => (
            <div className="validation-errors">
              <h4>Password Requirements:</h4>
              <ul>
                {messages.map((msg: FieldValidationMessage) => (
                  <li key={msg.message} className="error">
                    {msg.message}
                  </li>
                ))}
              </ul>
            </div>
          ),
        ),
      ),
    ).toEqual(
      stripSourceInfo(
        <div className="validation-errors">
          <h4>Password Requirements:</h4>
          <ul>
            <li key="Must be at least 5 characters" className="error">
              Must be at least 5 characters
            </li>
            <li key="Must contain uppercase letter" className="error">
              Must contain uppercase letter
            </li>
            <li key="Must contain a number" className="error">
              Must contain a number
            </li>
          </ul>
        </div>,
      ),
    );
  });

  it("should handle empty validation results with custom JSX", async () => {
    class AlwaysPassValidators extends Rules {
      alwaysValid() {
        return (() => true) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(AlwaysPassValidators);
    const validator = transval(myValidate("field").alwaysValid());

    const result = await validator.isValid({ field: "any value" });
    expect(result).toBe(true);

    // Test formatting when no errors exist
    expect(
      stripSourceInfo(
        validator.getMessages<RenderInput>(
          undefined,
          (messages: FieldValidationMessage[]) => {
            if (messages.length === 0) {
              return (
                <div className="success-message">
                  ✅ All validations passed!
                </div>
              );
            }
            return (
              <div className="error-list">
                {messages.map((msg) => msg.message).join(", ")}
              </div>
            );
          },
        ),
      ),
    ).toEqual(
      stripSourceInfo(
        <div className="success-message">✅ All validations passed!</div>,
      ),
    );
  });
});
