// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { rule, Rules, transval } from "./api.js";
import type { FieldValidationMessage } from "./types.js";

describe("JSX error rendering - Async scenarios", () => {
  it("should format async validation errors as JSX", async () => {
    class AsyncValidators extends Rules {
      asyncEmailCheck() {
        return (async (value: string) => {
          // Simulate async validation
          await new Promise((resolve) => setTimeout(resolve, 10));

          const errors: string[] = [];

          if (!value) {
            errors.push("Email is required");
          } else {
            if (!value.includes("@")) errors.push("Invalid email format");
            if (value === "admin@test.com") errors.push("Email already exists");
            if (value.includes("spam"))
              errors.push("Suspicious email detected");
          }

          return errors.length > 0 ? errors : true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(AsyncValidators);
    const validator = transval(myValidate("email").asyncEmailCheck());

    const result = await validator.isValid({ email: "spaminvalid" });
    expect(result).toBe(false);

    // Test async errors formatted as JSX alerts
    expect(
      validator.getMessages(undefined, (messages: FieldValidationMessage[]) => (
        <div className="alert alert-danger">
          <strong>Email Validation Failed:</strong>
          {messages.map((msg: FieldValidationMessage) => (
            <div key={msg.message} className="alert-item">
              {`• ${msg.message}`}
            </div>
          ))}
        </div>
      )),
    ).toEqual(
      <div className="alert alert-danger">
        <strong>Email Validation Failed:</strong>
        <div key="Invalid email format" className="alert-item">
          • Invalid email format
        </div>
        <div key="Suspicious email detected" className="alert-item">
          • Suspicious email detected
        </div>
      </div>,
    );
  });
});
