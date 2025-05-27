import { rule, Rules, transval } from "./dist/index.mjs";

class AsyncValidators extends Rules {
  asyncEmailCheck() {
    return async (value) => {
      console.log("AsyncValidator called with:", value);
      // Simulate async validation
      await new Promise((resolve) => setTimeout(resolve, 10));

      const errors = [];

      if (!value) {
        errors.push("Email is required");
      } else {
        if (!value.includes("@")) errors.push("Invalid email format");
        if (value === "admin@test.com") errors.push("Email already exists");
        if (value.includes("spam")) errors.push("Suspicious email detected");
      }

      console.log("Errors found:", errors);
      return errors.length > 0 ? errors : true;
    };
  }
}

async function test() {
  const myValidate = rule.extend(AsyncValidators);
  const validator = transval(myValidate("email").asyncEmailCheck());

  console.log("Testing spam@test.com...");
  const result = await validator.isValid({ email: "spam@test.com" });
  console.log("Result:", result);
  console.log("Messages:", validator.getMessages());
}

test().catch(console.error);
