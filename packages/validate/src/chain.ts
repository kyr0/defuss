import type {
  ValidationChainApi,
  ValidationStep,
  ValidatorFn,
} from "./types.js";
import * as validators from "./validators/index.js";
import { getByPath } from "defuss";

// @ts-ignore
export class BaseValidators<ET = ValidationChainApi>
  implements ValidationChainApi<ET>
{
  fieldPath: string;
  validatorStack: ValidationStep[];

  constructor(fieldPath: string) {
    this.fieldPath = fieldPath;
    this.validatorStack = [];

    // Bind the isValid method to preserve this context when destructured
    this.isValid = this.isValid.bind(this);
  }

  isValid<T = any>(formData: T): boolean {
    const value = getByPath(formData, this.fieldPath);

    for (const step of this.validatorStack) {
      const result = step.fn(value, ...step.args);
      if (result !== true) {
        return false;
      }
    }
    return true;
  }

  message(
    messageFn: (
      messages: string[],
      format: (msgs: string[]) => string,
    ) => string,
  ): ValidationChainApi<ET> & ET {
    return this as unknown as ValidationChainApi<ET> & ET;
  }
}

// --- Dynamic Prototype Extension ---

function chainFn(
  this: BaseValidators,
  fn: ValidatorFn,
  ...args: any[]
): BaseValidators {
  this.validatorStack.push({ fn, args });
  return this;
}

// Dynamically add validator methods to ValidationChainImpl prototype
for (const validatorName of Object.keys(validators)) {
  if (
    typeof validators[validatorName as keyof typeof validators] === "function"
  ) {
    const validatorFn = validators[
      validatorName as keyof typeof validators
    ] as ValidatorFn;

    (BaseValidators.prototype as any)[validatorName] = function (
      this: BaseValidators,
      ...args: any[]
    ) {
      return chainFn.call(this, validatorFn, ...args);
    };
  }
}

export function validate(
  fieldPath: string,
): ValidationChainApi<BaseValidators> {
  return new BaseValidators(
    fieldPath,
  ) as unknown as ValidationChainApi<BaseValidators>;
}

validate.extend = <ET extends new (...args: any[]) => any>(
  ExtensionClass: ET,
) => {
  const extensionPrototype = ExtensionClass.prototype;
  const basePrototype = BaseValidators.prototype;

  const extensionMethods = Object.getOwnPropertyNames(extensionPrototype);
  const baseMethods = Object.getOwnPropertyNames(basePrototype);

  extensionMethods.forEach((methodName) => {
    if (
      // Only add methods that don't exist on the base prototype
      methodName !== "constructor" &&
      !baseMethods.includes(methodName) &&
      typeof extensionPrototype[methodName] === "function"
    ) {
      (BaseValidators.prototype as any)[methodName] = function (
        this: BaseValidators,
        ...args: any[]
      ) {
        return chainFn.call(
          this,
          extensionPrototype[methodName](...args),
          ...args,
        );
      };
    }
  });

  const extendedValidationChain = (
    fieldPath: string,
  ): ValidationChainApi<InstanceType<ET>> & InstanceType<ET> =>
    new BaseValidators(fieldPath) as unknown as ValidationChainApi<
      InstanceType<ET>
    > &
      InstanceType<ET>;

  // allow for chaining even the extends
  extendedValidationChain.extend = validate.extend;

  return extendedValidationChain;
};

export type ExtendedValidationChain<T> = BaseValidators & T;
