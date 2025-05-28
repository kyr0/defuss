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
> The library follows a field-path based approach where you create validation rules for specific data paths using either string paths or type-safe PathAccessor objects, apply transformations and validations in a chainable manner, and then execute them against your data. When validation succeeds, you get access to the transformed data with type safety guarantees.

<h3 align="center">

Features

</h3>

- **Fluent API**: Chain validators together for a clean and readable validation syntax
- **Type Safety**: Written in TypeScript with strong type definitions and PathAccessor support for type-safe field paths
- **Extensible**: Easily add custom validators through the registry system
- **Parameterized Validators**: Support for validators that take parameters
- **Custom Error Messages**: Customize error messages for each validator or chain
- **Translation Support**: Built-in support for translating error messages
- **Async Support**: All validation operations return Promises for consistent async programming
- **PathAccessor Integration**: Use type-safe field paths with auto-completion and refactoring support

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
const { isValid, getMessages } = transval(usernameRule, emailRule, ageRule);

// Execute validation
if (await isValid(formData)) {
  console.log('Form data is valid!');
  
  // Access transformed data from individual rules
  const transformedUsername = usernameRule.getField("person.username");
  const transformedEmail = emailRule.getField("person.email");
  const transformedAge = ageRule.getField("person.age");
  
  console.log('Transformed data:', {
    username: transformedUsername,
    email: transformedEmail,
    age: transformedAge
  });
} else {
  // Get all validation messages
  const validationMessages = getMessages();
  console.log('Validation errors:', validationMessages);
  
  // Or get messages for specific fields
  const emailErrors = getMessages("person.email");
  console.log('Email errors:', emailErrors);
}
```

<h3 align="center">

PathAccessor Support

</h3>

`defuss-transval` supports both string-based and object-based path access. This provides better type safety and auto-completion when working with typed data structures.

```typescript
import { rule, transval, access } from 'defuss-transval';

type UserData = {
  user: {
    profile: {
      name: string;
      email: string;
      settings: {
        theme: 'light' | 'dark';
        notifications: boolean;
      };
    };
    posts: Array<{
      title: string;
      published: boolean;
    }>;
  };
};

const userData: UserData = {
  user: {
    profile: {
      name: 'John Doe',
      email: 'john@example.com',
      settings: {
        theme: 'dark',
        notifications: true
      }
    },
    posts: [
      { title: 'First Post', published: true },
      { title: 'Draft Post', published: false }
    ]
  }
};

const o = access<UserData>();

// setup rules using PathAccessors for type-safe field paths
const { isValid, getMessages } = transval(
  rule(o.user.profile.name)
    .asString()
    .isLongerThan(2), 
  rule(o.user.profile.email)
    .asString()
    .isEmail(), 
  rule(o.user.profile.settings.theme)
    .asString()
    .isOneOf(['light', 'dark']), 
  rule(o.user.posts[0].title)
    .asString()
    .isLongerThan(5)
);

if (await isValid(userData)) {
  console.log('User data is valid!');
  
  // Access transformed values using PathAccessor
  const transformedName = nameRule.getField(o.user.profile.name);
  const transformedEmail = emailRule.getField(o.user.profile.email);

  console.log('Transformed data:', {
    name: transformedName,
    email: transformedEmail
  });
} else {
  // Get validation messages for specific PathAccessor fields
  const nameErrors = getMessages(o.user.profile.name);
  const emailErrors = getMessages(o.user.profile.email);

  console.log('Validation errors:', {
    name: nameErrors,
    email: emailErrors
  });
}
```

<h3 align="center">

Mixed Usage

</h3>

You can mix string paths and PathAccessors in the same validation:

```typescript
// Mix string and PathAccessor approaches
const { isValid } = transval(
  rule("user.profile.name").asString().isRequired(),
  rule(o.user.profile.email).asString().isEmail(),
  rule("user.posts.0.title").asString().isLongerThan(3)
);

if (await isValid(userData)) {
  console.log('Mixed validation passed!');
}
```

#### Benefits of PathAccessor

- **Type Safety**: Get compile-time checking for field paths
- **Auto-completion**: IDE support for discovering available fields
- **Refactoring**: Automatic updates when you rename fields in your types
- **Runtime Safety**: PathAccessor validates that paths exist at runtime

<h3 align="center">

Custom Validators

</h3>

You can create custom validators by extending the `Rules` class and use them with both string paths and PathAccessors:

```typescript
import { rule, transval, Rules, access } from 'defuss-transval';

type FormData = {
  user: {
    email: string;
    username: string;
    preferences: {
      newsletter: boolean;
    };
  };
};

const o = access<FormData>();

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

const formData: FormData = {
  user: {
    email: 'john@example.com',
    username: 'johndoe123',
    preferences: {
      newsletter: true
    }
  }
};

// Extend the rule function with custom validators
const customRules = rule.extend(CustomRules);

// Use PathAccessors with custom validators
const emailRule = customRules(o.user.email)
  .isString()
  .checkEmail("/api/check-email");

const usernameRule = customRules(o.user.username)
  .isString()
  .isValidUsername(5);

// Mix with regular string paths
const newsletterRule = customRules("user.preferences.newsletter")
  .asBoolean()
  .isDefined();

const { isValid, getMessages } = transval(emailRule, usernameRule, newsletterRule);

if (await isValid(formData)) {
  console.log('Form data is valid!');
  
  // Access individual rule data using PathAccessors
  console.log('Email data:', emailRule.getField(o.user.email));
  console.log('Username data:', usernameRule.getField(o.user.username));
  console.log('Newsletter data:', newsletterRule.getField("user.preferences.newsletter"));
} else {
  // Get validation messages using PathAccessors
  const emailErrors = getMessages(o.user.email);
  const usernameErrors = getMessages(o.user.username);

  console.log('Validation errors:', {
    email: emailErrors,
    username: usernameErrors
  });
}
```


<h3 align="center">

Individual Rule Chain Methods

</h3>

Each rule chain created with `rule()` has its own methods for validation and data access. These methods work with both string paths and PathAccessors:

```typescript
import { access } from 'defuss-transval';

type PersonData = {
  person: {
    age: number;
    name: string;
  };
};

const formData: PersonData = {
  person: {
    age: 25,
    name: 'John Doe'
  }
};

const o = access<PersonData>();

// Create rule with PathAccessor
const ageRule = rule(o.person.age).asNumber().isGreaterThan(18);

// Execute validation for this specific rule
const isValid = await ageRule.isValid(formData);

// Get validation messages for this rule
const messages = ageRule.getMessages();

// Get the entire transformed form data (includes all fields)
const allData = ageRule.getData();

// Get a specific value using PathAccessor
const specificAge = ageRule.getField(o.person.age);

// Or using string path
const specificName = ageRule.getField("person.name");

console.log('Age value:', specificAge); // Type-safe access
```

**Note:** `getData()` returns the entire form data object with transformations applied, while `getField(path)` returns the value at a specific field path.

<h3 align="center">

Message Formatting

</h3>

You can customize error message formatting by passing a formatter function to `getMessages()`. The formatter can return JSX elements for rich UI rendering:

```typescript
const emailRule = rule("email").isString().isEmail();
const { isValid, getMessages } = transval(emailRule);

if (!await isValid({ email: "invalid-email" })) {
  // Get messages with custom JSX formatter
  const formattedMessages = getMessages(undefined, (messages) => {
    return (
      <div className="error-container">
        <h4>Email Validation Failed</h4>
        <ul>
          {messages.map((msg, index) => (
            <li key={index} className="error-item">
              <span className="error-icon">⚠️</span>
              {msg}
            </li>
          ))}
        </ul>
      </div>
    );
  });
  
  console.log(formattedMessages); // JSX element
}

// Or for specific field formatting
const fieldErrors = getMessages("email", (messages) => {
  return (
    <div className="field-error">
      {messages.map((msg, index) => (
        <p key={index} className="error-text">{msg}</p>
      ))}
    </div>
  );
});
```

<h3 align="center">

Data Access Methods

</h3>

After validation, you can access the original and transformed data using `getData()` and `getField()` methods:

```typescript
import { rule, transval, access } from 'defuss-transval';

interface FormData {
  name: string;
  age: string; // Input as string
  email: string;
  preferences: {
    newsletter: string; // "true" or "false"
  };
}

const o = access<FormData>();

const { isValid, getMessages, getData, getField } = transval(
  rule(o.name).isString(),
  rule(o.age).isString().asNumber(), // First validate as string, then transform to number
  rule(o.email).isEmail(),
  rule(o.preferences.newsletter).isString().asBoolean() // Transform to boolean
);

const formData: FormData = {
  name: "John Doe",
  age: "25", // String input
  email: "john@example.com",
  preferences: {
    newsletter: "true" // String input
  }
};

if (await isValid(formData)) {
  // Get the entire transformed data object
  const transformedData = getData();
  console.log(transformedData.age); // 25 (number, not string)
  console.log(transformedData.preferences.newsletter); // true (boolean, not string)
  
  // Get specific field values using string paths
  const userAge = getField("age"); // 25 (transformed to number)
  const newsletter = getField("preferences.newsletter"); // true (transformed to boolean)
  
  // Get specific field values using PathAccessor (type-safe)
  const userName = getField(o.name); // "John Doe" (original string)
  const userEmail = getField(o.email); // "john@example.com"
}
```

The `getData()` method returns the complete transformed data object, while `getField(path)` allows you to access specific fields. Both methods return `undefined` if called before validation or if the requested field doesn't exist.

<h3 align="center">

Sync Validation

</h3>

All validation operations are asynchronous and return Promises,
but you can still use a callback-based approach if needed:

```typescript
// Multiple rules validation
const { isValid } = transval(rule1, rule2, rule3);

// With callback support without await
isValid(formData, (isValidResult, error) => {
  if (error) {
    console.error('Validation error:', error);
  } else {
    console.log('Validation result:', isValidResult);
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
- `rule(fieldPath, options?)` - Create a validation rule for a specific field path (supports both string paths and PathAccessor objects)
- `transval(...rules)` - Combine multiple rules into a validation object that returns `{ isValid, getMessages }`
- `rule.extend(CustomClass)` - Extend the rule function with custom validators
- `access<T>()` - Create a PathAccessor for type-safe field paths

### Validation Object Methods (from `transval()`)
- `isValid(formData, callback?)` - Execute all rules and return combined result
- `getMessages(path?, formatter?)` - Get validation messages with optional custom formatter that can return JSX (all messages or for specific field, supports both string paths and PathAccessor objects)
- `getData()` - Get the transformed data after validation (returns the merged transformed data from all validation chains)
- `getField(path)` - Get a specific field value from the transformed data (supports both string paths and PathAccessor objects)

### Rule Chain Methods
- `isValid(formData, callback?)` - Execute validation and return boolean result
- `getMessages()` - Get validation error messages for this rule
- `getData()` - Get the entire transformed form data object
- `getField(path)` - Get a specific value from the transformed data (supports both string paths and PathAccessor objects)

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

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command       | Action                                                                                                                                                                                                                           |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm build`    | Build a new version of the library. |
| `npm test`    | Run the tests for the `defuss-transval` package. |

---

<img src="assets/defuss_comic.png" />

<caption><i><b>Come visit us on defuss island!</b></i></caption>