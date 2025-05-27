<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss-runtime</code>
</p>

<sup align="center">

Isomorphic JS Runtime API Enhancements

</sup>

</h1>


> `defuss-runtime` provides a set of isomorphic runtime API enhancements for JavaScript applications, including utilities for working with promises, arrays, objects, dates, functions and more. It is designed to be used in both Node.js and browser environments.


<h3 align="center">

Features

</h3>

<h3 align="center">

Basic Usage

</h3>

```typescript
import { validate, validateAll } from 'defuss-runtime';

const formData = {
  username: 'johndoe',
  email: 'john@example.com',
  age: 25
};

// Create validation chains for each field
const usernameChain = validate(formData, 'username')
  .isRequired()
  .isString()
  .isLongerThan(3);

const emailChain = validate(formData, 'email')
  .isRequired()
  .isString()
  .isEmail();

const ageChain = validate(formData, 'age')
  .isRequired()
  .isNumber()
  .isGreaterThan(18);

// Validate all chains at once
const result = await validateAll([
  usernameChain,
  emailChain,
  ageChain
]);

// Check if all validations passed
if (await result.isValid()) {
  console.log('All fields are valid!');
} else {
  // Get all error messages grouped by field
  const errors = await result.getErrors();
  console.log('Validation errors:', errors);
}
```

<h3 align="center">

Custom Validators

</h3>

You can register your own custom validators using the `ValidatorRegistry`:

```typescript
import { ValidatorRegistry, validate, validateAll } from 'defuss-validate';

// Register a simple validator (takes only a value)
ValidatorRegistry.registerSimple(
  'isHexColor',
  (value) => typeof value === 'string' && /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(value),
  'Must be a valid hex color code'
);

// Register a parameterized validator (takes value plus parameters)
ValidatorRegistry.registerParameterized(
  'isDivisibleBy',
  (value, divisor) => typeof value === 'number' && value % divisor === 0,
  'Must be divisible by {0}' // Use {0}, {1}, etc. for parameter placeholders
);

// Apply the registered validators to the ValidationChain
ValidatorRegistry.applyValidatorsToPrototype(ValidationChain.prototype);

// Use your custom validators
const colorChain = validate(formData, 'color').isHexColor();
const numberChain = validate(formData, 'value').isNumber().isDivisibleBy(2);

const result = await validateAll([colorChain, numberChain]);
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
- `isAfter(minDate)` - Checks if a date is after the minimum date
- `isBefore(maxDate)` - Checks if a date is before the maximum date

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command       | Action                                                                                                                                                                                                                           |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm build`    | Build a new version of the library. |
| `npm test`    | Run the tests for the `defuss-validate` package. |

---

<img src="assets/defuss_comic.png" />

<caption><i><b>Come visit us on defuss island!</b></i></caption>