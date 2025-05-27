<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss-transval</code>
</p>

<sup align="center">

Powerful Data Transformation and Validation

</sup>

</h1>


> `defuss-transval` provides a flexible, chainable API for data transformation and validation in JavaScript and TypeScript applications. 
> 
> It supports a wide range of built-in validators and transformers, allows for custom validators to be easily added while maintaining type safety, and is designed for both synchronous and asynchronous validation scenarios.
>
> The library follows a field-path based approach where you create validation rules for specific data paths, apply transformations and validations in a chainable manner, and then execute them against your data. When validation succeeds, you get access to the transformed data with type safety guarantees.

<h3 align="center">

Features

</h3>

- **Fluent API**: Chain validators together for a clean and readable validation syntax
- **Type Safety**: Written in TypeScript with strong type definitions
- **Extensible**: Easily add custom validators through the registry system
- **Parameterized Validators**: Support for validators that take parameters
- **Custom Error Messages**: Customize error messages for each validator or chain
- **Translation Support**: Built-in support for translating error messages
- **Async Support**: All validation operations return Promises for consistent async programming

<h3 align="center">

Basic Usage

</h3>

```typescript
import { rule, transval } from 'defuss-transval';

const formData = {
  person: {
    username: 'johndoe',
    email: 'john@example.com',
    age: 25
  },
  color: '#ff5733',
  someValue: 42
};

// Create individual validation rules
const usernameRule = rule("person.username").asString().isLongerThan(3);
const emailRule = rule("person.email").asString().isEmail();
const ageRule = rule("person.age").asNumber().not.isLessThan(14);

// Configure validation with multiple rules
const validation = transval(usernameRule, emailRule, ageRule);

// Execute validation
if (await validation.isValid(formData)) {
  console.log('Form data is valid!');
  
  // Access transformed data from individual rules
  const transformedUsername = usernameRule.getValue("person.username");
  const transformedEmail = emailRule.getValue("person.email");
  const transformedAge = ageRule.getValue("person.age");
  
  console.log('Transformed data:', {
    username: transformedUsername,
    email: transformedEmail,
    age: transformedAge
  });
} else {
  // Get all validation messages
  const validationMessages = validation.getMessages();
  console.log('Validation errors:', validationMessages);
  
  // Or get messages for specific fields
  const emailErrors = validation.getMessages("person.email");
  console.log('Email errors:', emailErrors);
}
```

<h3 align="center">

Custom Validators

</h3>

You can create custom validators by extending the `Rules` class:

```typescript
import { rule, transval, Rules } from 'defuss-transval';

class CustomRules extends Rules {
  checkEmail(apiEndpoint: string) {
    return (async (value: string) => {
      // Simulate an async API call
      await new Promise((resolve) => setTimeout(resolve, 100));
      return value.includes("@") && value.includes(".");
    }) as unknown as Rules & this;
  }

  isValidUsername(minLength: number = 3) {
    return ((value: string) => {
      return typeof value === 'string' && 
             value.length >= minLength && 
             /^[a-zA-Z0-9_]+$/.test(value);
    }) as unknown as Rules & this;
  }
}

const formData = {
  email: 'john@example.com',
  username: 'johndoe123'
};

// Extend the rule function with custom validators
const customRules = rule.extend(CustomRules);

const emailRule = customRules("email").isString().checkEmail("/api/check-email");
const usernameRule = customRules("username").isString().isValidUsername(5);

const validation = transval(emailRule, usernameRule);

if (await validation.isValid(formData)) {
  console.log('Form data is valid!');
  
  // Access individual rule data
  console.log('Email data:', emailRule.getValue("email"));
  console.log('Username data:', usernameRule.getValue("username"));
} else {
  // Get all validation messages
  const validationMessages = validation.getMessages();
  console.log('Validation errors:', validationMessages);
}
```

<h3 align="center">

Available Validators

</h3>

### Type Validators
- `isSafeNumber()` - Checks if a value is a safe number (finite and not NaN)
- `isString()` - Checks if a value is a string
- `isArray()` - Checks if a value is an array
- `isObject()` - Checks if a value is an object
- `isDate()` - Checks if a value is a valid date
- `isSafeNumeric()` - Checks if a value is safely numeric
- `isInteger()` - Checks if a value is an integer

### Presence Validators
- `isNull()` - Checks if a value is null
- `isRequired()` - Checks if a value is not undefined, null, or empty
- `isUndefined()` - Checks if a value is undefined
- `isDefined()` - Checks if a value is defined (not undefined)
- `isEmpty()` - Checks if a value is empty (empty string, array, or object)

### Format Validators
- `isEmail()` - Checks if a value is a valid email address
- `isUrl()` - Checks if a value is a valid URL
- `isUrlPath()` - Checks if a value is a valid URL path
- `isSlug()` - Checks if a value is a valid slug
- `isPhoneNumber()` - Checks if a value is a valid phone number

### Comparison Validators
- `is(value)` - Strict equality check (===)
- `isEqual(value)` - Deep equality check using JSON comparison
- `isOneOf(allowedValues)` - Checks if a value is one of the allowed values

### Length Validators
- `isLongerThan(minLength, inclusive?)` - Checks if length is longer than specified
- `isShorterThan(maxLength, inclusive?)` - Checks if length is shorter than specified

### Numeric Comparison Validators
- `isGreaterThan(minValue, inclusive?)` - Checks if a number is greater than specified value
- `isLessThan(maxValue, inclusive?)` - Checks if a number is less than specified value

### Date Comparison Validators
- `isAfter(minDate, inclusive?)` - Checks if a date is after the specified date
- `isBefore(maxDate, inclusive?)` - Checks if a date is before the specified date

### Pattern Validator
- `hasPattern(pattern)` - Checks if a string matches the specified regex pattern

### Transformers
- `asString()` - Transforms value to string
- `asNumber()` - Transforms value to number
- `asBoolean()` - Transforms value to boolean
- `asDate()` - Transforms value to Date object
- `asArray(transformerFn?)` - Transforms value to array
- `asInteger()` - Transforms value to integer

### Negation
All validators can be negated using the `.not` property:
```typescript
rule("age").not.isLessThan(18)  // age must NOT be less than 18
rule("email").not.isEmpty()     // email must NOT be empty
```

<h3 align="center">

Individual Rule Chain Methods

</h3>

Each rule chain created with `rule()` has its own methods for validation and data access:

```typescript
const ageRule = rule("person.age").asNumber().isGreaterThan(18);

// Execute validation for this specific rule
const isValid = await ageRule.isValid(formData);

// Get validation messages for this rule
const messages = ageRule.getMessages();

// Get the entire transformed form data (includes all fields)
const allData = ageRule.getData();

// Get a specific value from the transformed data
const specificValue = ageRule.getValue("person.age");
```

**Note:** `getData()` returns the entire form data object with transformations applied, while `getValue(path)` returns the value at a specific field path.

<h3 align="center">

Message Formatting

</h3>

You can customize error message formatting using the `useFormatter` method:

```typescript
const rule1 = rule("email")
  .isString()
  .isEmail()
  .useFormatter((messages, defaultFormat) => {
    return `Email validation failed: ${defaultFormat(messages)}`;
  });

const validation = transval(rule1);

if (!await validation.isValid({ email: "invalid-email" })) {
  console.log(validation.getMessages()); // Custom formatted messages
}
```

<h3 align="center">

Async Validation

</h3>

All validation operations are asynchronous and return Promises:

```typescript
// Individual rule validation
const isEmailValid = await emailRule.isValid(formData);

// Multiple rules validation
const areAllValid = await transval(rule1, rule2, rule3).isValid(formData);

// With callback support
await validation.isValid(formData, (isValid, error) => {
  if (error) {
    console.error('Validation error:', error);
  } else {
    console.log('Validation result:', isValid);
  }
});
```

<h3 align="center">

Validation Options

</h3>

You can configure validation behavior by passing options to the `rule()` function:

```typescript
const options = {
  timeout: 10000, // Validation timeout in milliseconds (default: 5000)
  onValidationError: (error, step) => {
    console.error('Validation step failed:', step, error);
  }
};

const rule1 = rule("email", options).isString().isEmail();

// Timeout example - validation will throw if it takes longer than specified
try {
  const isValid = await rule1.isValid(formData);
} catch (error) {
  if (error.message.includes('timeout')) {
    console.log('Validation timed out');
  }
}
```

<h3 align="center">

Complete API Reference

</h3>

### Main Functions
- `rule(fieldPath, options?)` - Create a validation rule for a specific field path
- `transval(...rules)` - Combine multiple rules into a validation object
- `rule.extend(CustomClass)` - Extend the rule function with custom validators

### Rule Chain Methods
- `isValid(formData, callback?)` - Execute validation and return boolean result
- `getMessages()` - Get validation error messages for this rule
- `getData()` - Get the entire transformed form data object
- `getValue(path)` - Get a specific value from the transformed data
- `useFormatter(messageFn)` - Customize error message formatting

### Validation Object Methods (from `transval()`)
- `isValid(formData, callback?)` - Execute all rules and return combined result
- `getMessages(path?, formatter?)` - Get validation messages (all or for specific field)

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command       | Action                                                                                                                                                                                                                           |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm build`    | Build a new version of the library. |
| `npm test`    | Run the tests for the `defuss-transval` package. |

---

<img src="assets/defuss_comic.png" />

<caption><i><b>Come visit us on defuss island!</b></i></caption>