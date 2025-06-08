export type ValidationMessage = string | number | boolean | null | undefined;
export type ValidationFnResult = true | ValidationMessage;

export type ValidatorPrimitiveFn<T = unknown> = (
  value: T,
  message?: string,
) => boolean | string | Promise<boolean | string>;

export interface SingleValidationResult {
  message?: ValidationMessage;
  isValid: boolean;
}

export type ValidatorFn<T extends any[] = any[]> = (
  ...args: T
) => boolean | string;

export type ValidationStep<T extends any[] = any[]> = {
  fn: ValidatorFn<T>;
  args: T;
};
