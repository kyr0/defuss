export type ValidationMessage = string | number | boolean | null | undefined;
export type ValidationFnResult = true | ValidationMessage;

export type ValidatorPrimitiveFn<T = unknown> = (
  value: T,
) => boolean | Promise<boolean>;

export interface SingleValidationResult {
  message?: ValidationMessage;
  isValid: boolean;
}

export type ValidatorFn<T extends unknown[] = unknown[]> = (
  ...args: T
) => boolean | string;

export type ValidationStep<T extends unknown[] = unknown[]> = {
  fn: ValidatorFn<T>;
  args: T;
};
