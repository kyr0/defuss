import type {
  ValidationChainApi,
  ValidationStep,
  ValidatorFn,
} from "./types.js";
import * as validators from "./validators/index.js";
import { getByPath } from "defuss";
import { createTimeoutPromise } from "defuss";

// --- Core Async Validation Call & Chain ---

export class ValidationCall<VT = boolean> {
  name: string;
  fn: (...args: any[]) => Promise<VT>;
  args: any[];

  constructor(
    name: string,
    fn: (...args: any[]) => Promise<VT>,
    ...args: any[]
  ) {
    this.name = name;
    this.fn = fn;
    this.args = args;
  }
}

export interface ValidationChainOptions {
  timeout?: number;
  autoStart?: boolean;
  autoStartDelay?: number;
  onValidationError?: (error: Error, step: ValidationStep) => void;
}

// @ts-ignore
export class BaseValidators<ET = ValidationChainApi>
  implements ValidationChainApi<ET>
{
  fieldPath: string;
  validationCalls: ValidationCall[];
  stackPointer: number;
  isResolved: boolean;
  stoppedWithError: Error | null;
  lastResult: boolean;
  options: ValidationChainOptions;
  chainStartTime: number;
  chainAsyncStartTime: number;

  constructor(fieldPath: string, options: ValidationChainOptions = {}) {
    this.fieldPath = fieldPath;
    this.validationCalls = [];
    this.stackPointer = 0;
    this.isResolved = false;
    this.stoppedWithError = null;
    this.lastResult = true;
    this.options = {
      timeout: 5000,
      autoStart: true,
      autoStartDelay: 1,
      ...options,
    };
    this.chainStartTime = performance.now();
    this.chainAsyncStartTime = 0;

    // Bind methods to preserve context
    this.isValid = this.isValid.bind(this);
  }

  // Async validation method that maintains the original API signature
  async isValid<T = any>(formData: T): Promise<boolean> {
    const value = getByPath(formData, this.fieldPath);

    try {
      // Execute all validation calls in sequence
      for (const call of this.validationCalls) {
        const result = await call.fn(value, ...call.args);
        if (result !== true) {
          return false;
        }
      }

      return true;
    } catch (error) {
      this.stoppedWithError = error as Error;
      if (this.options.onValidationError) {
        this.options.onValidationError(error as Error, {
          fn: () => false,
          args: [],
        });
      }
      return false;
    }
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

export class BaseValidatorsThenable<
  ET = ValidationChainApi,
> extends BaseValidators<ET> {
  constructor(fieldPath: string, options: ValidationChainOptions = {}) {
    super(fieldPath, options);
  }

  // biome-ignore lint/suspicious/noThenProperty: Required for Promise-like behavior
  then<TResult1 = boolean, TResult2 = never>(
    onfulfilled?: ((value: boolean) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    this.chainAsyncStartTime = performance.now();

    if (this.stoppedWithError) {
      return Promise.reject(this.stoppedWithError).then(
        onfulfilled as any,
        onrejected,
      );
    }

    if (this.isResolved) {
      return Promise.resolve(this.lastResult).then(
        onfulfilled as any,
        onrejected,
      );
    }

    return this.runValidationChain()
      .then((result) => {
        this.lastResult = result;
        this.isResolved = true;
        return onfulfilled ? onfulfilled(result) : (result as any);
      })
      .catch(onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<boolean | TResult> {
    return this.then(undefined, onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<boolean> {
    return this.then(
      (value) => {
        onfinally?.();
        return value;
      },
      (reason) => {
        onfinally?.();
        throw reason;
      },
    );
  }

  private async runValidationChain(): Promise<boolean> {
    return createTimeoutPromise(
      this.options.timeout!,
      async () => {
        // This would be called with actual form data in real usage
        // For now, we'll need the form data to be passed when awaited
        throw new Error(
          "Validation requires form data. Use validate(formData) instead of await.",
        );
      },
      () => {
        this.stoppedWithError = new Error(
          `Validation timeout after ${this.options.timeout}ms`,
        );
      },
    );
  }
}

// --- Dynamic Prototype Extension (Simplified) ---

function chainFn(
  this: BaseValidators,
  fn: ValidatorFn,
  ...args: any[]
): BaseValidators {
  this.validationCalls.push(
    new ValidationCall<boolean>(
      "validator",
      async (value) => {
        const result = fn(value, ...args);
        // Handle both sync and async validator functions
        const resolvedResult = await Promise.resolve(result);
        return resolvedResult === true;
      },
      ...args,
    ),
  );

  return this;
}

function asyncChainFn(
  this: BaseValidators,
  fn: ValidatorFn,
  ...args: any[]
): BaseValidatorsThenable {
  this.validationCalls.push(
    new ValidationCall<boolean>(
      "async-validator",
      async (value) => {
        const result = await fn(value, ...args);
        return result === true;
      },
      ...args,
    ),
  );

  return createSubValidationChain(this, BaseValidatorsThenable);
}

// Dynamically add validator methods to both prototypes
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

    (BaseValidatorsThenable.prototype as any)[validatorName] = function (
      this: BaseValidatorsThenable,
      ...args: any[]
    ) {
      return asyncChainFn.call(this, validatorFn, ...args);
    };
  }
}

export function validate(
  fieldPath: string,
  options?: ValidationChainOptions,
): ValidationChainApi<BaseValidators> {
  return new BaseValidators(
    fieldPath,
    options,
  ) as unknown as ValidationChainApi<BaseValidators>;
}

validate.async = (
  fieldPath: string,
  options?: ValidationChainOptions,
): ValidationChainApi<BaseValidatorsThenable> => {
  return new BaseValidatorsThenable(
    fieldPath,
    options,
  ) as unknown as ValidationChainApi<BaseValidatorsThenable>;
};

validate.extend = <ET extends new (...args: any[]) => any>(
  ExtensionClass: ET,
) => {
  const extensionPrototype = ExtensionClass.prototype;
  const basePrototype = BaseValidators.prototype;

  const extensionMethods = Object.getOwnPropertyNames(extensionPrototype);
  const baseMethods = Object.getOwnPropertyNames(basePrototype);

  extensionMethods.forEach((methodName) => {
    if (
      methodName !== "constructor" &&
      !baseMethods.includes(methodName) &&
      typeof extensionPrototype[methodName] === "function"
    ) {
      // Add to both sync and async prototypes
      (BaseValidators.prototype as any)[methodName] = function (
        this: BaseValidators,
        ...args: any[]
      ) {
        const validatorFn = extensionPrototype[methodName](...args);

        // Check if the validator function is async
        if (validatorFn && typeof validatorFn.then === "function") {
          return asyncChainFn.call(this, validatorFn, ...args);
        } else {
          return chainFn.call(this, validatorFn, ...args);
        }
      };

      (BaseValidatorsThenable.prototype as any)[methodName] = function (
        this: BaseValidatorsThenable,
        ...args: any[]
      ) {
        const validatorFn = extensionPrototype[methodName](...args);
        return asyncChainFn.call(this, validatorFn, ...args);
      };
    }
  });

  const extendedValidationChain = (
    fieldPath: string,
    options?: ValidationChainOptions,
  ): ValidationChainApi<InstanceType<ET>> & InstanceType<ET> =>
    new BaseValidators(fieldPath, options) as unknown as ValidationChainApi<
      InstanceType<ET>
    > &
      InstanceType<ET>;

  extendedValidationChain.async = (
    fieldPath: string,
    options?: ValidationChainOptions,
  ): ValidationChainApi<InstanceType<ET>> & InstanceType<ET> =>
    new BaseValidatorsThenable(
      fieldPath,
      options,
    ) as unknown as ValidationChainApi<InstanceType<ET>> & InstanceType<ET>;

  extendedValidationChain.extend = validate.extend;

  return extendedValidationChain;
};

function createSubValidationChain<T extends BaseValidators>(
  source: BaseValidators,
  Constructor: new (fieldPath: string, options?: ValidationChainOptions) => T,
): T {
  const subChain = new Constructor(source.fieldPath, source.options);
  subChain.validationCalls = source.validationCalls;
  subChain.stackPointer = source.stackPointer;
  subChain.stoppedWithError = source.stoppedWithError;
  subChain.lastResult = source.lastResult;
  subChain.isResolved = source.isResolved;
  return subChain;
}

// Auto-start behavior similar to dequery
function delayedAutoStart<T extends BaseValidators>(chain: T): T {
  if (chain.options.autoStart) {
    setTimeout(async () => {
      if (
        chain.chainAsyncStartTime === 0 &&
        chain instanceof BaseValidatorsThenable
      ) {
        // Auto-start only works with explicit form data
        console.warn(
          "Auto-start validation requires explicit validate(formData) call",
        );
      }
    }, chain.options.autoStartDelay!);
  }
  return chain;
}

export type ExtendedValidationChain<T> = BaseValidators & T;
