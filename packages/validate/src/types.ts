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
  isNumber(): ValidationChainApi<ET> & ET;
  isString(): ValidationChainApi<ET> & ET;
  isRequired(): ValidationChainApi<ET> & ET;
  isDefined(): ValidationChainApi<ET> & ET;
  isEmail(): ValidationChainApi<ET> & ET;
  isEqual(value: any): ValidationChainApi<ET> & ET;
  isLongerThan(length: number): ValidationChainApi<ET> & ET;
  isShorterThan(length: number): ValidationChainApi<ET> & ET;
  isGreaterThan(value: number): ValidationChainApi<ET> & ET;
  isLowerThan(value: number): ValidationChainApi<ET> & ET;
  hasPattern(pattern: RegExp): ValidationChainApi<ET> & ET;
  message(
    messageFn: (
      messages: string[],
      format: (msgs: string[]) => string,
    ) => string,
  ): ValidationChainApi<ET> & ET;
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
