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
  lastValidationResult: AllValidationResult;
  options: ValidationChainOptions;
  messageFormatter?: (
    messages: string[],
    format: (msgs: string[]) => string,
  ) => string;

  constructor(fieldPath: string, options: ValidationChainOptions = {}) {
    this.fieldPath = fieldPath;
    this.validationCalls = [];
    this.lastValidationResult = { isValid: true, messages: [] };
    this.options = { timeout: 5000, ...options };

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
      setTimeout(async () => {
        try {
          const result = await this._performValidation(formData);
          callback(result.isValid, result.error);
        } catch (error) {
          callback(false, error as Error);
        }
      }, 0);

      return Promise.resolve(true);
    }

    // For non-callback case, let timeout and runtime errors propagate
    try {
      const result = await this._performValidation(formData);
      return result.isValid;
    } catch (error) {
      // Re-throw timeout errors and runtime errors (like missing field paths)
      if (
        (error as Error).message.includes("timeout") ||
        (error as Error).message.includes("Validation failed for field:")
      ) {
        throw error;
      }
      return false;
    }
  }

  private async _performValidation<T = any>(
    formData: T,
  ): Promise<AllValidationResult> {
    const validationPromise = this._executeValidation(formData);

    // Apply timeout if configured
    if (this.options.timeout && this.options.timeout > 0) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(`Validation timeout after ${this.options.timeout}ms`),
          );
        }, this.options.timeout);
      });

      return Promise.race([validationPromise, timeoutPromise]);
    }

    return validationPromise;
  }

  private async _executeValidation<T = any>(
    formData: T,
  ): Promise<AllValidationResult> {
    // Get field value with path validation
    const value = this._getFieldValue(formData);

    const messages: string[] = [];
    let isValid = true;

    try {
      // Execute all validation calls in sequence
      for (const call of this.validationCalls) {
        const result = await call.fn(value, ...call.args);
        if (result !== true) {
          isValid = false;
          messages.push(
            typeof result === "string"
              ? result
              : `Validation failed for ${call.name}`,
          );
        }
      }

      this.lastValidationResult = { isValid, messages };
      return this.lastValidationResult;
    } catch (error) {
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

      return errorResult;
    }
  }

  private _getFieldValue<T = any>(formData: T): any {
    const value = getByPath(formData, this.fieldPath);

    // Check if the field path exists for dotted paths
    if (value === undefined && this.fieldPath.includes(".")) {
      const pathParts = this.fieldPath.split(".");
      let current = formData;

      for (let i = 0; i < pathParts.length; i++) {
        if (current === null || current === undefined) {
          throw new Error(
            `Validation failed for field: ${this.fieldPath} - path not found at '${pathParts
              .slice(0, i)
              .join(".")}'`,
          );
        }

        if (typeof current !== "object" || !(pathParts[i] in current)) {
          throw new Error(
            `Validation failed for field: ${this.fieldPath} - field '${pathParts[i]}' not found`,
          );
        }

        current = (current as any)[pathParts[i]];
      }
      return current;
    }

    return value;
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
    // For thenable behavior, resolve immediately with the chain itself
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
        const result = await Promise.resolve(fn(value, ...args));
        return result as boolean;
      },
      ...args,
    ),
  );

  return this;
}

// Dynamically add validator methods to prototype
for (const [validatorName, validatorFn] of Object.entries(validators)) {
  if (typeof validatorFn === "function") {
    (BaseValidators.prototype as any)[validatorName] = function (
      this: BaseValidators,
      ...args: any[]
    ) {
      return chainFn.call(this, validatorFn as ValidatorFn, ...args);
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
  // Get only the custom methods from the extension class
  const extensionMethods = Object.getOwnPropertyNames(
    ExtensionClass.prototype,
  ).filter(
    (name) =>
      name !== "constructor" &&
      !Object.getOwnPropertyNames(BaseValidators.prototype).includes(name) &&
      typeof ExtensionClass.prototype[name] === "function",
  );

  // Add extension methods to BaseValidators prototype
  extensionMethods.forEach((methodName) => {
    (BaseValidators.prototype as any)[methodName] = function (
      this: BaseValidators,
      ...args: any[]
    ) {
      const validatorFn = ExtensionClass.prototype[methodName](...args);
      return chainFn.call(this, validatorFn, ...args);
    };
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
