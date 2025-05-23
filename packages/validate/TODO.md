Validation library for Form/Data validation at runtime.
API should be: 

const someFormData = $('#someForm').form();

const { isValid, isFieldValid, getError, getErrors } = await validate([
  validate(someFormData, 'email')
    .isRequired()
    .isString()
    .isLongerThan(3)
    .isShorterThan(10),

  validate(someFormData, 'age')
    .isRequired()
    .isNumber()
    .isGreaterThan(0)
    .isLowerThan(120)
    .message((messages, format) => "Fehler: {format(messages)}!"),

  validate(someFormData, 'email')
    .isRequired()
    .isString()
    .hasPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .message((messages, format) => "Fehler: {format(messages)}!"),
]).translate('de');

// isValid(): Promise<boolean>
// isFieldValid(fieldPath: string): Promise<boolean>
// getError(fieldPath: string): Promise<string | undefined>
// getErrors(): Promise<Record<string, string[]>>

// fieldPath can use  getByPath(obj: any, path: string): any from 'defuss' package

Currently implemented is the internal validation API, featuring a lot of validators and an Array-based API, but we need a chaining API using AST call chaining, well typed calling these internals.

The new API should re-use the internal API like this:

const validationResult = await validate(
  formData,
  {
    email: [isValidEmail, isValidDefined],
    password: [isValidDefined],
    passwordAgain: [isValidDefined, arePasswordsEqual],
  },
  true, // default value
);

and this configuration: 
{
    email: [isValidEmail, isValidDefined],
    password: [isValidDefined],
    passwordAgain: [isValidDefined, arePasswordsEqual],
  }

Shall be produced by the then() function of the chainable API (custom promise chain).