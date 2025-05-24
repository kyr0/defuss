import type {
  SingleValidationStateResult,
  SingleValidationResult,
  ValidationMap,
  ValidationResult,
  Validator,
} from "./types.js";

export const validateSingle = async <T = any, F = any>(
  value: T, // input value to pass to the/each validator
  validationChain: Array<Validator>, // one or more validators
  stopOnInvalid = true, // in case you want all states, set this to false; return on first error: true
  formState?: F,
): Promise<SingleValidationStateResult> => {
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
  validationChain: ValidationMap<T>, // one or more validators
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
export { validate as validateChain } from "./chain.js";
