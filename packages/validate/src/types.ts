import type { ValidationStep } from "defuss-runtime";

// Utility type for cleaner return types
type ValidationChain<ET = {}> = ValidationChainApi<ET> & ET;

// TODO: Does not correspond to the actual API, needs to be updated
export interface ValidationChainApi<ET = {}> {
  // Basic type validators
  isNumberSafe(): ValidationChain<ET>;
  isString(): ValidationChain<ET>;
  isArray(): ValidationChain<ET>;
  isObject(): ValidationChain<ET>;
  isDate(): ValidationChain<ET>;
  isNumericAndSafe(): ValidationChain<ET>;
  isBoolean(): ValidationChain<ET>;
  isInteger(): ValidationChain<ET>;

  // Presence validators
  // TODO:
  is(): ValidationChain<ET>;
  isInstanceOf<T>(c: new (...args: any[]) => T): ValidationChain<ET>;
  isTypeOf(type: string): ValidationChain<ET>;

  isRequired(): ValidationChain<ET>; // has some value (!undefined or null or empty)

  isDefined(): ValidationChain<ET>;
  isEmpty(): ValidationChain<ET>;
  isNull(): ValidationChain<ET>;
  isUndefined(): ValidationChain<ET>;
  isNullOrUndefined(): ValidationChain<ET>;

  // Format validators
  isEmail(): ValidationChain<ET>;
  isUrl(): ValidationChain<ET>;
  isUrlPath(): ValidationChain<ET>;
  isSlug(): ValidationChain<ET>;
  isPhoneNumber(): ValidationChain<ET>;

  // Comparison validators
  isEqual<T>(value: T): ValidationChain<ET>;
  isOneOf<T extends readonly (string | number)[]>(
    options: T,
  ): ValidationChain<ET>;

  // Length validators
  isLongerThan(minLength: number, inclusive?: boolean): ValidationChain<ET>;
  isShorterThan(maxLength: number, inclusive?: boolean): ValidationChain<ET>;
  hasLengthBetween(
    minLength: number,
    maxLength: number,
    inclusive?: boolean,
  ): ValidationChain<ET>;
  hasExactLength(length: number): ValidationChain<ET>;

  // Numeric comparison validators
  isGreaterThan(minValue: number, inclusive?: boolean): ValidationChain<ET>;
  isLessThan(maxValue: number, inclusive?: boolean): ValidationChain<ET>;
  isBetween(
    minValue: number,
    maxValue: number,
    inclusive?: boolean,
  ): ValidationChain<ET>;
  isPositive(includeZero?: boolean): ValidationChain<ET>;
  isNegative(includeZero?: boolean): ValidationChain<ET>;

  // Date comparison validators
  isAfter(minDate: Date, inclusive?: boolean): ValidationChain<ET>;
  isBefore(maxDate: Date, inclusive?: boolean): ValidationChain<ET>;
  isBetweenDates(
    startDate: Date,
    endDate: Date,
    inclusive?: boolean,
  ): ValidationChain<ET>;

  // Pattern validator
  hasPattern(pattern: RegExp): ValidationChain<ET>;

  // Message formatter
  message(
    messageFn: (
      messages: string[],
      format: (msgs: string[]) => string,
    ) => string,
  ): ValidationChain<ET>;

  // Validation execution
  isValid<T = unknown>(formData: T): Promise<boolean>;
  getMessages(): string[];
  getFormattedMessage(): string;
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
