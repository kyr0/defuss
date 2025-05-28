// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { rule, Rules, transval } from "./api.js";
import type { FieldValidationMessage } from "./types.js";

describe("JSX error rendering - Complex nested scenarios", () => {
  it("should handle complex nested validation with conditional JSX", async () => {
    class ConditionalValidators extends Rules {
      complexUserValidation() {
        return ((user: any) => {
          const errors: string[] = [];

          if (!user || typeof user !== "object") {
            errors.push("User data is required");
            return errors;
          }

          if (!user.profile?.firstName) errors.push("First name is required");
          if (!user.profile?.lastName) errors.push("Last name is required");
          if (!user.contact?.email) errors.push("Email is required");
          if (user.contact?.email && !user.contact.email.includes("@")) {
            errors.push("Valid email is required");
          }

          return errors.length > 0 ? errors : true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(ConditionalValidators);
    const validator = transval(myValidate("userData").complexUserValidation());

    const result = await validator.isValid({
      userData: {
        profile: { firstName: "", lastName: "Doe" },
        contact: { email: "" },
      },
    });
    expect(result).toBe(false);

    // Test complex conditional JSX formatting
    expect(
      validator.getMessages(undefined, (messages: FieldValidationMessage[]) => {
        const profileErrors = messages.filter((msg) =>
          msg.message.includes("name is required"),
        );
        const contactErrors = messages.filter(
          (msg) =>
            msg.message.includes("Email") ||
            msg.message.includes("Valid email"),
        );

        return (
          <div className="validation-summary">
            {profileErrors.length > 0 && (
              <div className="profile-errors">
                <h5>Profile Issues:</h5>
                {profileErrors.map((error) => (
                  <p key={error.message} className="profile-error">
                    {error.message}
                  </p>
                ))}
              </div>
            )}
            {contactErrors.length > 0 && (
              <div className="contact-errors">
                <h5>Contact Issues:</h5>
                {contactErrors.map((error) => (
                  <p key={error.message} className="contact-error">
                    {error.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      }),
    ).toEqual(
      <div className="validation-summary">
        <div className="profile-errors">
          <h5>Profile Issues:</h5>
          <p key="First name is required" className="profile-error">
            First name is required
          </p>
        </div>
        <div className="contact-errors">
          <h5>Contact Issues:</h5>
          <p key="Email is required" className="contact-error">
            Email is required
          </p>
        </div>
      </div>,
    );
  });
});
