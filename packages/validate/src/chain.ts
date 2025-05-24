import type {
  AllValidationResult,
  ValidationChainApi,
  ValidationChainOptions,
  ValidatorFn,
} from "./types.js";
import * as validators from "./validators/index.js";
import { getByPath } from "defuss";

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
  lastValidationResult: AllValidationResult;
  options: ValidationChainOptions;
  chainStartTime: number;
  chainAsyncStartTime: number;
  messageFormatter?: (
    messages: string[],
    format: (msgs: string[]) => string,
  ) => string;

  constructor(fieldPath: string, options: ValidationChainOptions = {}) {
    this.fieldPath = fieldPath;
    this.validationCalls = [];
    this.stackPointer = 0;
    this.isResolved = false;
    this.stoppedWithError = null;
    this.lastResult = true;
    this.lastValidationResult = { isValid: true, messages: [] };
    this.options = {
      timeout: 5000,
      ...options,
    };
    this.chainStartTime = performance.now();
    this.chainAsyncStartTime = 0;

    // Bind methods to preserve context
    this.isValid = this.isValid.bind(this);
    this.getMessages = this.getMessages.bind(this);
    this.getFormattedMessage = this.getFormattedMessage.bind(this);
  }

  // Async validation method that maintains the original API signature
  async isValid<T = any>(
    formData: T,
    callback?: (isValid: boolean, error?: Error) => void,
  ): Promise<boolean> {
    // If callback is provided, use co-routine approach
    if (typeof callback === "function") {
      // Use setTimeout for non-blocking co-routine execution
      setTimeout(async () => {
        try {
          const result = await this._performValidationWithTimeout(formData);
          // If validation returned an error result (not thrown), pass the error to callback
          if (result.error) {
            callback(result.isValid, result.error);
          } else {
            callback(result.isValid);
          }
        } catch (error) {
          // If an error was thrown, pass it to callback
          callback(false, error as Error);
        }
      }, 0);

      // Return a resolved promise immediately for non-blocking behavior
      return Promise.resolve(true);
    }

    // For non-callback case, let timeout and runtime errors propagate but catch validation errors
    try {
      const result = await this._performValidationWithTimeout(formData);
      return result.isValid;
    } catch (error) {
      // Re-throw timeout errors and runtime errors (like missing field paths)
      if (
        (error as Error).message.includes("timeout") ||
        (error as Error).message.includes("Validation failed for field:")
      ) {
        throw error;
      }
      // For other validation errors, return false
      return false;
    }
  }

  private async _performValidationWithTimeout<T = any>(
    formData: T,
  ): Promise<AllValidationResult> {
    if (this.options.timeout && this.options.timeout > 0) {
      // Use Promise.race with setTimeout-based timeout
      let timeoutId: NodeJS.Timeout;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          const timeoutError = new Error(
            `Validation timeout after ${this.options.timeout}ms`,
          );
          this.stoppedWithError = timeoutError;
          reject(timeoutError);
        }, this.options.timeout);
      });

      try {
        const result = await Promise.race([
          this._performValidation(formData),
          timeoutPromise,
        ]);
        clearTimeout(timeoutId!);
        return result;
      } catch (error) {
        clearTimeout(timeoutId!);
        throw error;
      }
    }
    return this._performValidation(formData);
  }

  private async _performValidation<T = any>(
    formData: T,
  ): Promise<AllValidationResult> {
    let value: any;
    value = getByPath(formData, this.fieldPath);

    // Check if the field path exists - if getByPath returns undefined and the path has dots,
    // it likely means the field doesn't exist in the form data
    if (value === undefined && this.fieldPath.includes(".")) {
      // Try to traverse the path manually to see if it's a missing field
      const pathParts = this.fieldPath.split(".");
      let current = formData;

      for (let i = 0; i < pathParts.length; i++) {
        if (current === null || current === undefined) {
          throw new Error(
            `Validation failed for field: ${this.fieldPath} - path not found at '${pathParts.slice(0, i).join(".")}'`,
          );
        }

        if (typeof current !== "object" || !(pathParts[i] in current)) {
          throw new Error(
            `Validation failed for field: ${this.fieldPath} - field '${pathParts[i]}' not found`,
          );
        }

        current = (current as any)[pathParts[i]];
      }
      value = current;
    }

    const messages: string[] = [];
    let isValid = true;

    try {
      // Execute all validation calls in sequence
      for (const call of this.validationCalls) {
        const result = await call.fn(value, ...call.args);
        if (result !== true) {
          isValid = false;
          if (typeof result === "string") {
            messages.push(result);
          } else {
            messages.push(`Validation failed for ${call.name}`);
          }
          // Continue to collect all error messages instead of stopping at first failure
        }
      }

      this.lastValidationResult = { isValid, messages };
      return this.lastValidationResult;
    } catch (error) {
      this.stoppedWithError = error as Error;
      const errorResult = {
        isValid: false,
        messages: [`Validation error: ${(error as Error).message}`],
        error: error as Error,
      };
      this.lastValidationResult = errorResult;

      if (this.options.onValidationError) {
        this.options.onValidationError(error as Error, {
          fn: () => false,
          args: [],
        });
      }
      // Return the error result for validation errors (thrown by validators)
      return errorResult;
    }
  }

  message(
    messageFn?: (
      messages: string[],
      format: (msgs: string[]) => string,
    ) => string,
  ): ValidationChainApi<ET> & ET {
    if (messageFn) {
      this.messageFormatter = messageFn;
    }
    return this as unknown as ValidationChainApi<ET> & ET;
  }

  getMessages(): string[] {
    return this.lastValidationResult.messages;
  }

  getFormattedMessage(): string {
    const defaultFormatter = (msgs: string[]) => msgs.join(", ");

    if (this.messageFormatter) {
      return this.messageFormatter(
        this.lastValidationResult.messages,
        defaultFormatter,
      );
    }
    return defaultFormatter(this.lastValidationResult.messages);
  }

  // biome-ignore lint/suspicious/noThenProperty: Required for Promise-like behavior
  then<TResult1 = boolean, TResult2 = never>(
    onfulfilled?:
      | ((value: BaseValidators<ET>) => TResult1 | PromiseLike<TResult1>)
      | null,
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
      return Promise.resolve(this as any).then(onfulfilled as any, onrejected);
    }

    // For thenable behavior, resolve immediately with the chain itself
    // This allows the chain to be used in .then() calls like dequery
    return Promise.resolve(this as any).then(onfulfilled as any, onrejected);
  }
}

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
        // Return the actual result to preserve string messages
        return resolvedResult as boolean;
      },
      ...args,
    ),
  );

  return this;
}

// Dynamically add validator methods to prototype
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
  options?: ValidationChainOptions,
): ValidationChainApi<BaseValidators> {
  return new BaseValidators(
    fieldPath,
    options,
  ) as unknown as ValidationChainApi<BaseValidators>;
}

export function validateAll(
  chains: BaseValidators[],
  options?: ValidationChainOptions,
): {
  isValid: <T = any>(
    formData: T,
    callback?: (isValid: boolean, error?: Error) => void,
  ) => Promise<boolean>;
  getMessages: () => string[];
  getFormattedMessage: () => string;
};
export function validateAll(...chains: BaseValidators[]): {
  isValid: <T = any>(
    formData: T,
    callback?: (isValid: boolean, error?: Error) => void,
  ) => Promise<boolean>;
  getMessages: () => string[];
  getFormattedMessage: () => string;
};
export function validateAll(
  chainsOrFirstChain: BaseValidators[] | BaseValidators,
  optionsOrSecondChain?: ValidationChainOptions | BaseValidators,
  ...restChains: BaseValidators[]
): {
  isValid: <T = any>(
    formData: T,
    callback?: (isValid: boolean, error?: Error) => void,
  ) => Promise<boolean>;
  getMessages: () => string[];
  getFormattedMessage: () => string;
} {
  let chains: BaseValidators[];
  let options: ValidationChainOptions = {};

  // Handle different call signatures
  if (Array.isArray(chainsOrFirstChain)) {
    // validateAll([chain1, chain2], options?)
    chains = chainsOrFirstChain;
    options = (optionsOrSecondChain as ValidationChainOptions) || {};
  } else {
    // validateAll(chain1, chain2, chain3, ...)
    chains = [chainsOrFirstChain];
    if (optionsOrSecondChain && "fieldPath" in optionsOrSecondChain) {
      // Second argument is a BaseValidators, not options
      chains.push(optionsOrSecondChain as BaseValidators);
    }
    chains.push(...restChains);
  }

  return {
    async isValid<T = any>(
      formData: T,
      callback?: (isValid: boolean, error?: Error) => void,
    ): Promise<boolean> {
      // If callback is provided, use co-routine approach
      if (typeof callback === "function") {
        setTimeout(async () => {
          try {
            const results = await Promise.all(
              chains.map((chain) => chain.isValid(formData)),
            );
            const isValid = results.every((result) => result);
            callback(isValid);
          } catch (error) {
            callback(false, error as Error);
          }
        }, 0);

        return Promise.resolve(true);
      }

      // For non-callback case, validate all chains
      try {
        const results = await Promise.all(
          chains.map((chain) => chain.isValid(formData)),
        );
        return results.every((result) => result);
      } catch (error) {
        // Re-throw timeout errors and runtime errors (like missing field paths)
        if (
          (error as Error).message.includes("timeout") ||
          (error as Error).message.includes("Validation failed for field:")
        ) {
          throw error;
        }
        // For other validation errors, return false
        return false;
      }
    },

    getMessages(): string[] {
      return chains.flatMap((chain) => chain.getMessages());
    },

    getFormattedMessage(): string {
      const allMessages = chains.flatMap((chain) => chain.getMessages());
      const defaultFormatter = (msgs: string[]) => msgs.join(", ");

      // Use the first chain's formatter if available, otherwise use default
      const firstChainWithFormatter = chains.find(
        (chain) => chain.messageFormatter,
      );
      if (firstChainWithFormatter?.messageFormatter) {
        return firstChainWithFormatter.messageFormatter(
          allMessages,
          defaultFormatter,
        );
      }

      return defaultFormatter(allMessages);
    },
  };
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
      methodName !== "constructor" &&
      !baseMethods.includes(methodName) &&
      typeof extensionPrototype[methodName] === "function"
    ) {
      (BaseValidators.prototype as any)[methodName] = function (
        this: BaseValidators,
        ...args: any[]
      ) {
        const validatorFn = extensionPrototype[methodName](...args);
        return chainFn.call(this, validatorFn, ...args);
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

  extendedValidationChain.extend = validate.extend;

  return extendedValidationChain;
};

export type ExtendedValidationChain<T> = BaseValidators & T;
