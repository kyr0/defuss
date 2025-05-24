import { validate, BaseValidators } from "./chain.js";

describe("Chain", () => {
  test("should validate number field", async () => {
    const { isValid } = validate("age.value").isNumber().isGreaterThan(10);

    const formData = {
      age: {
        value: 12,
      },
    };
    expect(await isValid(formData)).toBe(true);
  });

  it("can be extended with custom validators", async () => {
    // Define custom validators as a class that extends BaseValidators
    class CustomValidators extends BaseValidators {
      customValidator(prefix: string) {
        return ((value: string) =>
          typeof value === "string" &&
          value.startsWith(prefix)) as unknown as BaseValidators & this;
      }
    }

    const myValidate = validate.extend(CustomValidators);

    // important: extend from base custom validators class
    class CustomValidators2 extends CustomValidators {
      customValidator2(prefix: string) {
        return ((value: string) =>
          typeof value === "string" &&
          value.startsWith(prefix)) as unknown as BaseValidators & this;
      }
    }

    const myValidate2 = myValidate.extend(CustomValidators2);

    const { isValid } = myValidate2("customField")
      .isString()
      .customValidator("custom_")
      .customValidator2("custom_");

    const formData = {
      customField: "custom_value",
    };
    expect(await isValid(formData)).toBe(true);

    expect(
      await isValid({
        customField: "cust0m_value",
      }),
    ).toBe(false);
  });

  test("should handle async custom validators", async () => {
    class AsyncValidators extends BaseValidators {
      asyncEmailCheck(apiEndpoint: string) {
        return (async (value: string) => {
          // Simulate async API call
          await new Promise((resolve) => setTimeout(resolve, 100));
          return value.includes("@") && value.includes(".");
        }) as unknown as BaseValidators & this;
      }
    }

    const myValidateAsync = validate.extend(AsyncValidators);
    const { isValid } = myValidateAsync
      .async("email")
      .isString()
      .asyncEmailCheck("/api/check-email");

    expect(await isValid({ email: "test@example.com" })).toBe(true);
    expect(await isValid({ email: "invalid-email" })).toBe(false);
  });
});
