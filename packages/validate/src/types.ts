export type ValidationMessage = string | any;
export type ValidationFnResult = true | ValidationMessage;

export type ValidatorPrimitiveFn = (value: any) => boolean | Promise<boolean>;

export interface SingleValidationResult {
  message?: ValidationMessage;
  isValid: boolean;
}

export type ValidatorFn = (...args: any[]) => boolean | string;
export type ValidationStep = { fn: ValidatorFn; args: any[] };

export interface ValidationChainApi<ET = {}> {
  // Basic type validators
  isNumber(): ValidationChainApi<ET> & ET;
  isString(): ValidationChainApi<ET> & ET;
  isArray(): ValidationChainApi<ET> & ET;
  isObject(): ValidationChainApi<ET> & ET;
  isDate(): ValidationChainApi<ET> & ET;
  isNumeric(): ValidationChainApi<ET> & ET;

  // Presence validators
  isRequired(): ValidationChainApi<ET> & ET;
  isDefined(): ValidationChainApi<ET> & ET;
  isEmpty(): ValidationChainApi<ET> & ET;

  // Format validators
  isEmail(): ValidationChainApi<ET> & ET;
  isUrl(): ValidationChainApi<ET> & ET;
  isUrlPath(): ValidationChainApi<ET> & ET;
  isSlug(): ValidationChainApi<ET> & ET;
  isPhoneNumber(): ValidationChainApi<ET> & ET;

  // Comparison validators
  isEqual(value: any): ValidationChainApi<ET> & ET;
  isOneOf(options: Array<string | number>): ValidationChainApi<ET> & ET;

  // Length validators
  isLongerThan(
    minLength: number,
    includeEqual?: boolean,
  ): ValidationChainApi<ET> & ET;
  isShorterThan(
    maxLength: number,
    includeEqual?: boolean,
  ): ValidationChainApi<ET> & ET;

  // Numeric comparison validators
  isGreaterThan(
    minValue: number,
    includeEqual?: boolean,
  ): ValidationChainApi<ET> & ET;
  isLowerThan(
    maxValue: number,
    includeEqual?: boolean,
  ): ValidationChainApi<ET> & ET;

  // Date comparison validators
  isAfterMinDate(
    minDate: Date,
    inclusive?: boolean,
  ): ValidationChainApi<ET> & ET;
  isBeforeMaxDate(
    maxDate: Date,
    inclusive?: boolean,
  ): ValidationChainApi<ET> & ET;

  // Pattern validator
  hasPattern(pattern: RegExp): ValidationChainApi<ET> & ET;

  // Message formatter
  message(
    messageFn: (
      messages: string[],
      format: (msgs: string[]) => string,
    ) => string,
  ): ValidationChainApi<ET> & ET;

  // Validation execution
  isValid: (formData: any) => Promise<boolean>;
  getMessages: () => string[];
  getFormattedMessage: () => string;
}

export interface ValidationChainOptions {
  timeout?: number;
  onValidationError?: (error: Error, step: ValidationStep) => void;
}

export interface AllValidationResult {
  isValid: boolean;
  messages: string[];
  error?: Error;
}
