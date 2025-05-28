import { describe, expect, it } from "vitest";
import { access } from "defuss-runtime";
import { rule, transval } from "./api.js";

interface FormData {
  name: string;
  age: string; // Input as string
  email: string;
  preferences: {
    newsletter: string; // "true" or "false"
  };
}

describe("Debug Data Access Methods", () => {
  it("should debug validation step by step", async () => {
    const acc = access<FormData>();

    const formData: FormData = {
      name: "John Doe",
      age: "25", // String input
      email: "john@example.com",
      preferences: {
        newsletter: "true", // String input
      },
    };

    // Test each rule individually first
    console.log("Testing individual rules...");

    const nameRule = rule(acc.name).isString();
    const nameValid = await nameRule.isValid(formData);
    console.log(
      "Name rule valid:",
      nameValid,
      "Messages:",
      nameRule.getMessages(),
    );

    const ageRule = rule(acc.age).isString().asNumber();
    const ageValid = await ageRule.isValid(formData);
    console.log(
      "Age rule valid:",
      ageValid,
      "Messages:",
      ageRule.getMessages(),
    );

    const emailRule = rule(acc.email).isEmail();
    const emailValid = await emailRule.isValid(formData);
    console.log(
      "Email rule valid:",
      emailValid,
      "Messages:",
      emailRule.getMessages(),
    );

    const newsletterRule = rule(acc.preferences.newsletter)
      .isString()
      .asBoolean();
    const newsletterValid = await newsletterRule.isValid(formData);
    console.log(
      "Newsletter rule valid:",
      newsletterValid,
      "Messages:",
      newsletterRule.getMessages(),
    );

    // Now test combined
    const validation = transval(nameRule, ageRule, emailRule, newsletterRule);

    const { isValid, getMessages } = validation;
    const combinedValid = await isValid(formData);
    console.log("Combined validation:", combinedValid);
    console.log("All messages:", getMessages());

    expect(combinedValid).toBe(true);
  });
});
