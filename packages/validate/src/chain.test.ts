import { validate, BaseValidators } from "./chain.js";

describe("Chain", () => {
  test("should validate number field", async () => {
    const { isValid } = validate("age.value").isNumber().isGreaterThan(10);

    const formData = {
      age: {
        value: 12,
      },
    };
    expect(isValid(formData)).toBe(true);
  });

  it("can be extended with custom validators", () => {
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
    expect(isValid(formData)).toBe(true);

    expect(
      isValid({
        customField: "cust0m_value",
      }),
    ).toBe(false);
  });
});
