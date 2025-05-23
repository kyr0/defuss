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

export type ValidationChainMap<T> = {
  [fieldName in keyof T]?: Array<Validator>;
};

export interface SingleValidationChainResult extends SingleValidationResult {
  states: Array<SingleValidationResult>;
}

export type ValidationChainMapResult<T> = {
  [fieldName in keyof T]?: SingleValidationResult;
};

export type ValidationResult<T> = ValidationChainMapResult<T> &
  SingleValidationResult;

export const validateSingle = async <T = any, F = any>(
  value: T, // input value to pass to the/each validator
  validationChain: Array<Validator>, // one or more validators
  stopOnInvalid = true, // in case you want all states, set this to false; return on first error: true
  formState?: F,
): Promise<SingleValidationChainResult> => {
  let intermediateResult: SingleValidationResult = { isValid: true };
  const states: Array<SingleValidationResult> = [];
  for (let i = 0; i < validationChain.length; i++) {
    const result = await validationChain[i]({
      value,
      intermediateResult,
      states,
      formState: formState || value,
    });
    if (result !== true) {
      const validationResult: SingleValidationResult = {
        isValid: false,
        message: result,
      };
      states.push(validationResult);
      intermediateResult = validationResult;
      if (stopOnInvalid) break;
    } else {
      states.push({ isValid: true });
    }
  }
  return {
    ...intermediateResult,
    states,
  };
};

export const validate = async <T = any>(
  value: T, // input value to pass to the/each validator
  validationChain: ValidationChainMap<T>, // one or more validators
  stopOnInvalid = true, // in case you want all states, set this to false; return on first error: true
): Promise<ValidationResult<T>> => {
  const fieldNames = Object.keys(validationChain);
  // @ts-ignore
  let intermediateResult: ValidationResult<T> = {
    isValid: true,
  };
  for (let i = 0; i < fieldNames.length; i++) {
    const fieldName = fieldNames[i] as keyof T;
    const singleIntermediateResult = await validateSingle(
      value[fieldName],
      validationChain[fieldName] as Array<Validator>,
      stopOnInvalid,
      value,
    );
    intermediateResult = {
      ...intermediateResult,
      [fieldName]: singleIntermediateResult,
      isValid: singleIntermediateResult.isValid,
    };
    if (stopOnInvalid && !singleIntermediateResult.isValid) break;
  }
  return intermediateResult;
};

export * from "./validators/index.js";
