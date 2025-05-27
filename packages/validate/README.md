<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss-transval</code>
</p>

<sup align="center">

Powerful Data Transformation and Validation

</sup>

</h1>


> `defuss-transval` provides a flexible, chainable API for data transformation and validation in JavaScript and TypeScript applications. It supports a wide range of built-in validators, allows for custom validators to be easily added while maintaining type safety. It is designed for both synchronous and asynchronous transformation and validation scenarios.

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

// configure a partial transformation and validation rule set
const { isValid, getMessages, getData, getValue } = transval(
  rule("person.username").asString().isLongerThan(3),
  rule("person.email").asString().isEmail(),
  rule("person.age").asNumber().isGreaterThan(18)
);

// resolves the whole, potentially async transformation/validation chain
if (await isValid(formData)) {
  // full set of data with partially transformed nested fields
  const transformedData = getData();
  console.log('Form data is valid! Data:', transformedData);
} else {
  // Get all validation messages
  const validationMessages = await getMessages();
  console.log('Validation errors:', validationMessages);
}
```

<h3 align="center">

Custom Validators

</h3>

You can register your own custom validators using the `ValidatorRegistry`:

```typescript
import { rule, transval, Rules } from 'defuss-validate';

class CustomRules extends Rules {
  asyncEmailCheck(apiEndpoint: string) {
    return (async (value: string) => {
      // Simulate an async API call
      await new Promise((resolve) => setTimeout(resolve, 100));
      return value.includes("@") && value.includes(".");
    }) as unknown as Rules & this;
  }
}

const formData = {
  email: 'john@example.com',
};

const customRules = rule.extend(CustomRules);

const { isValid, getMessages } = transval(
  customRules("email")
    .isString()
    .asyncEmailCheck("/api/check-email")
);

// resolves the whole chain
if (await isValid(formData)) {
  // full set of data with partially transformed nested fields
  const transformedData = getData();
  console.log('Form data is valid! Data:', transformedData);
} else {
  // Get all validation messages
  const validationMessages = await getMessages();
  console.log('Validation errors:', validationMessages);
}
```

<h3 align="center">

Type-Safe Custom Validators with Generics

</h3>

To make your custom validators type-safe with proper TypeScript support:

```typescript
import { ValidatorRegistry, ValidationChain, validate } from 'defuss-validate';
import type { SimpleValidators, ParameterizedValidators } from 'defuss-validate/extend-types';

// 1. Define interfaces for your custom validators
interface HexColorValidator<T> extends SimpleValidators<T> {
  isHexColor(): T;
}

interface DivisibleByValidator<T> extends ParameterizedValidators<T> {
  isDivisibleBy(divisor: number): T;
}

// 2. Create a custom ValidationChain type with your validators
type CustomValidationChain<T = any> = ValidationChain<
  T, 
  HexColorValidator<any>, 
  DivisibleByValidator<any>
>;

// 3. Register your custom validators
ValidatorRegistry.registerSimple(
  'isHexColor', 
  (value) => typeof value === 'string' && /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(value),
  'Must be a valid hex color code'
);

ValidatorRegistry.registerParameterized(
  'isDivisibleBy',
  (value, divisor) => typeof value === 'number' && value % divisor === 0,
  'Must be divisible by {0}'
);

// 4. Apply validators to the ValidationChain prototype
ValidatorRegistry.applyValidatorsToPrototype(ValidationChain.prototype);

// 5. Create a helper function to use your custom ValidationChain
function customValidate<T = any>(data: T, fieldPath: string): CustomValidationChain<T> {
  return validate<T, HexColorValidator<any>, DivisibleByValidator<any>>(data, fieldPath);
}

// 6. Now you can use your custom validators with full type safety!
const colorChain = customValidate(formData, 'color')
  .isRequired()
  .isString()
  .isHexColor();  // TypeScript now recognizes this method

const numberChain = customValidate(formData, 'value')
  .isRequired()
  .isNumber()
  .isDivisibleBy(2);  // TypeScript now recognizes this method with parameters
```

<h3 align="center">

Available Validators

</h3>

### Simple Validators (no parameters)
- `isRequired()` - Checks if a value is not undefined, null, or empty string
- `isString()` - Checks if a value is a string
- `isNumber()` - Checks if a value is a number
- `isEmail()` - Checks if a value is a valid email address
- `isUrl()` - Checks if a value is a valid URL
- `isDate()` - Checks if a value is a valid date
- `isArray()` - Checks if a value is an array
- `isObject()` - Checks if a value is an object
- `isEmpty()` - Checks if a value is empty
- `isNumeric()` - Checks if a value is numeric
- `isPhoneNumber()` - Checks if a value is a valid phone number
- `isSlug()` - Checks if a value is a valid slug
- `isUrlPath()` - Checks if a value is a valid URL path

### Parameterized Validators (with parameters)
- `isLongerThan(minLength)` - Checks if a string is longer than the specified length
- `isShorterThan(maxLength)` - Checks if a string is shorter than the specified length
- `isGreaterThan(minValue)` - Checks if a number is greater than the specified value
- `isLessThan(maxValue)` - Checks if a number is lower than the specified value
- `hasPattern(pattern)` - Checks if a string matches the specified regex pattern
- `isEqual(compareValue)` - Checks if a value is equal to another value
- `isOneOf(allowedValues)` - Checks if a value is one of the allowed values
- `isAfterMinDate(minDate)` - Checks if a date is after the minimum date
- `isBeforeMaxDate(maxDate)` - Checks if a date is before the maximum date

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command       | Action                                                                                                                                                                                                                           |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm build`    | Build a new version of the library. |
| `npm test`    | Run the tests for the `defuss-validate` package. |

---

<img src="assets/defuss_comic.png" />

<caption><i><b>Come visit us on defuss island!</b></i></caption>