import { rule, Rules } from './dist/index.mjs';

class AsyncValidators extends Rules {
  asyncEmailCheck() {
    return (async (value) => {
      console.log('AsyncValidator called with:', value);
      // Simulate async validation (e.g., checking if email exists)
      await new Promise(resolve => setTimeout(resolve, 10));
      
      if (value === "taken@example.com") {
        console.log('Returning: Email is already taken');
        return "Email is already taken";
      }
      if (!value.includes("@")) {
        console.log('Returning: Invalid email format');
        return "Invalid email format";
      }
      console.log('Returning: true');
      return true;
    });
  }
}

async function test() {
  const myValidate = rule.extend(AsyncValidators);
  const validator = myValidate("email").asyncEmailCheck();

  console.log('Testing taken email...');
  const result = await validator.isValid({ email: "taken@example.com" });
  console.log('Result:', result);
  console.log('Messages:', validator.getMessages());
}

test().catch(console.error);
