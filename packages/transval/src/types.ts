import type { ValidationStep, PathAccessor } from "defuss-runtime";
import type { Call } from "./api.js";

// Utility type for cleaner return types
type ValidationChain<ET = {}> = ValidationChainApi<ET> & ET;

export interface ValidationChainApi<ET = {}> {
  fieldPath: string | PathAccessor<any>;
  validationCalls: Call[];
  lastValidationResult: AllValidationResult;
  transformedData: any;
  options: ValidationChainOptions;

  // Negation chain for the current validation
  not: ValidationChainApi<ET> & ET;

  // Basic type validators
  isSafeNumber(): ValidationChain<ET>;
  isString(): ValidationChain<ET>;
  isArray(): ValidationChain<ET>;
  isObject(): ValidationChain<ET>;
  isDate(): ValidationChain<ET>;
  isSafeNumeric(): ValidationChain<ET>;
  isBoolean(): ValidationChain<ET>;
  isInteger(): ValidationChain<ET>;

  // Presence validators

  isNull(): ValidationChain<ET>; // has no value (null)
  isRequired(): ValidationChain<ET>; // has some value (isDefined() and !isNull() and !isEmpty())
  isUndefined(): ValidationChain<ET>;

  isDefined(): ValidationChain<ET>;
  isEmpty(): ValidationChain<ET>;

  // Format validators
  isEmail(): ValidationChain<ET>;
  isUrl(): ValidationChain<ET>;
  isUrlPath(): ValidationChain<ET>;
  isSlug(): ValidationChain<ET>;
  isPhoneNumber(): ValidationChain<ET>;

  // Comparison validators
  is(v: any): ValidationChain<ET>; // === check
  isEqual<T>(
    // must be equal to the provided value
    value: T,
  ): ValidationChain<ET>; // equals check (via JSON stringify, equalsJSON from defuss-runtime)
  isInstanceOf<T>(c: new (...args: any[]) => T): ValidationChain<ET>; // instanceof check
  isTypeOf(type: string): ValidationChain<ET>; // typeof check (e.g., "string", "number", etc.)
  isOneOf<T extends readonly (string | number)[]>(
    // must be one of the provided values
    options: T,
  ): ValidationChain<ET>;

  // Length validators
  isLongerThan(minLength: number, inclusive?: boolean): ValidationChain<ET>;
  isShorterThan(maxLength: number, inclusive?: boolean): ValidationChain<ET>;

  // Numeric comparison validators
  isGreaterThan(minValue: number, inclusive?: boolean): ValidationChain<ET>;
  isLessThan(maxValue: number, inclusive?: boolean): ValidationChain<ET>;

  // Date comparison validators
  isAfter(minDate: Date, inclusive?: boolean): ValidationChain<ET>;
  isBefore(maxDate: Date, inclusive?: boolean): ValidationChain<ET>;

  // Transformers
  asString(): ValidationChain<ET>;
  asNumber(): ValidationChain<ET>;
  asBoolean(): ValidationChain<ET>;
  asDate(): ValidationChain<ET>;
  asArray(transformerFn: (value: any) => any): ValidationChain<ET>;
  asInteger(): ValidationChain<ET>;

  // Pattern validator
  hasPattern(pattern: RegExp): ValidationChain<ET>;

  // Message formatter
  useFormatter(
    messageFn: (
      messages: string[],
      format: (msgs: string[]) => string,
    ) => string,
  ): ValidationChain<ET>;

  // Validation execution
  isValid<T = unknown>(formData: T): Promise<boolean>;
  getMessages(): string[];

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
  messages: string[];
  error?: Error;
}
