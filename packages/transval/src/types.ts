import type { ValidationStep, PathAccessor } from "defuss-runtime";
import type { Call } from "./api.js";

// Utility type for cleaner return types
type ValidationChain<ET = {}> = ValidationChainApi<ET> & ET;

export interface FieldValidationMessage<T = string> {
  message: T;
  path: string;
}

export interface ValidationChainApi<ET = {}> {
  fieldPath: string | PathAccessor<any>;
  validationCalls: Call[];
  lastValidationResult: AllValidationResult;
  transformedData: any;
  options: ValidationChainOptions;

  // Negation chain for the current validation
  not: ValidationChainApi<ET> & ET;

  // Basic type validators
  isSafeNumber(message?: string): ValidationChain<ET>;
  isString(message?: string): ValidationChain<ET>;
  isArray(message?: string): ValidationChain<ET>;
  isObject(message?: string): ValidationChain<ET>;
  isDate(message?: string): ValidationChain<ET>;
  isSafeNumeric(message?: string): ValidationChain<ET>;
  isBoolean(message?: string): ValidationChain<ET>;
  isInteger(message?: string): ValidationChain<ET>;

  // Presence validators

  isNull(message?: string): ValidationChain<ET>; // has no value (null)
  isRequired(message?: string): ValidationChain<ET>; // has some value (isDefined() and !isNull() and !isEmpty())
  isUndefined(message?: string): ValidationChain<ET>;

  isDefined(message?: string): ValidationChain<ET>;
  isEmpty(message?: string): ValidationChain<ET>;

  isInstanceOf<T extends new (...args: any[]) => any>(
    someConstructorFunction: T,
    message?: string,
  ): ValidationChain<ET>; // instanceof check

  isTypeOf(type: string, message?: string): ValidationChain<ET>; // typeof check (e.g., "string", "number", etc.)
  isNull(message?: string): ValidationChain<ET>; // has no value (null)

  // Format validators
  isEmail(message?: string): ValidationChain<ET>;
  isUrl(message?: string): ValidationChain<ET>;
  isUrlPath(message?: string): ValidationChain<ET>;
  isSlug(message?: string): ValidationChain<ET>;
  isPhoneNumber(message?: string): ValidationChain<ET>;
  hasDateFormat(format: string, message?: string): ValidationChain<ET>;
  hasPattern(pattern: RegExp, message?: string): ValidationChain<ET>;

  // Comparison validators
  is(v: any, message?: string): ValidationChain<ET>; // === check
  isEqual<T>(
    // must be equal to the provided value
    value: T,
    message?: string,
  ): ValidationChain<ET>; // equals check (via JSON stringify, equalsJSON from defuss-runtime)
  isInstanceOf<T>(
    c: new (...args: any[]) => T,
    message?: string,
  ): ValidationChain<ET>; // instanceof check
  isTypeOf(type: string, message?: string): ValidationChain<ET>; // typeof check (e.g., "string", "number", etc.)
  isOneOf<T extends readonly (string | number)[]>(
    // must be one of the provided values
    options: T,
    message?: string,
  ): ValidationChain<ET>;

  // Boolean validators
  isTrue(message?: string): ValidationChain<ET>; // checks if the value is true
  isFalse(message?: string): ValidationChain<ET>; // checks if the value is false
  isTruthy(message?: string): ValidationChain<ET>; // checks if the value is truthy
  isFalsy(message?: string): ValidationChain<ET>; // checks if the value is falsy

  // Length validators
  isLongerThan(
    minLength: number,
    inclusive?: boolean,
    message?: string,
  ): ValidationChain<ET>;
  isShorterThan(
    maxLength: number,
    inclusive?: boolean,
    message?: string,
  ): ValidationChain<ET>;

  // Numeric comparison validators
  isGreaterThan(
    minValue: number,
    inclusive?: boolean,
    message?: string,
  ): ValidationChain<ET>;
  isLessThan(
    maxValue: number,
    inclusive?: boolean,
    message?: string,
  ): ValidationChain<ET>;

  // Date comparison validators
  isAfter(
    minDate: Date,
    inclusive?: boolean,
    message?: string,
  ): ValidationChain<ET>;
  isBefore(
    maxDate: Date,
    inclusive?: boolean,
    message?: string,
  ): ValidationChain<ET>;

  // Transformers
  asString(): ValidationChain<ET>;
  asNumber(): ValidationChain<ET>;
  asBoolean(): ValidationChain<ET>;
  asDate(): ValidationChain<ET>;
  asArray(transformerFn: (value: any) => any): ValidationChain<ET>;
  asInteger(): ValidationChain<ET>;

  // Message formatter
  useFormatter(
    messageFn: (
      messages: FieldValidationMessage[],
      format: (msgs: FieldValidationMessage[]) => string,
    ) => string,
  ): ValidationChain<ET>;

  // Validation execution
  isValid<T = unknown>(formData: T): Promise<boolean>;
  getMessages(): FieldValidationMessage[];

  // Data access methods
  getData(): any;
  getField(path: string | PathAccessor<any>): any;
}

export interface ValidationChainOptions {
  timeout?: number;
  onValidationError?: <T extends unknown[] = unknown[]>(
    error: Error,
    step: ValidationStep<T>,
  ) => void;
}

export interface AllValidationResult {
  isValid: boolean;
  messages: FieldValidationMessage[];
  error?: Error;
}
