export type ValidationMessage = string | any;
export type ValidationFnResult = true | ValidationMessage;

export interface IntermediateValidationState {
  value: any;
  intermediateResult: SingleValidationResult;
  states: Array<SingleValidationResult>;

  /** holds any value of any field validated already */
  formState: any;
}

export type Validator = (
  validationState: IntermediateValidationState,
) => ValidationFnResult | Promise<ValidationFnResult>;

export type ValidatorPrimitiveFn = (value: any) => boolean | Promise<boolean>;

export interface SingleValidationResult {
  message?: ValidationMessage;
  isValid: boolean;
}

export type ValidationMap<T> = {
  [fieldName in keyof T]?: Array<Validator>;
};

export interface SingleValidationStateResult extends SingleValidationResult {
  states: Array<SingleValidationResult>;
}

export type ValidationStateMapResult<T> = {
  [fieldName in keyof T]?: SingleValidationResult;
};

export type ValidationResult<T> = ValidationStateMapResult<T> &
  SingleValidationResult;

// chain types

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
  translate(locale: string): ValidationChainApi<ET> & ET;

  // Core validation method
  isValid: (formData: any) => boolean;
}
