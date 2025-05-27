import type {
  AllValidationResult,
  ValidationChainApi,
  ValidationChainOptions,
} from "./types.js";
import type { ValidatorFn } from "defuss-runtime";
import { getByPath, setByPath } from "defuss-runtime";
import { validators } from "./validators.js";
import { transformers } from "./transformers.js";

export class Call<VT = boolean> {
  constructor(
    public name: string,
    public fn: (...args: any[]) => Promise<VT>,
    public args: any[],
    public type: "validator" | "transformer" = "validator",
  ) {}
}

// @ts-ignore: Allow dynamic typing for validation calls without adding all methods to the class
export class Rules<ET = ValidationChainApi> implements ValidationChainApi<ET> {
  fieldPath: string;
  validationCalls: Call[];
  lastValidationResult: AllValidationResult;
  transformedData: any;
  options: ValidationChainOptions;
  messageFormatter?: (
    messages: string[],
    format: (msgs: string[]) => string,
  ) => string;

  constructor(fieldPath: string, options: ValidationChainOptions = {}) {
    this.fieldPath = fieldPath;
    this.validationCalls = [];
    this.lastValidationResult = { isValid: true, messages: [] };
    this.transformedData = undefined;
    this.options = { timeout: 5000, ...options };

    // bind methods for destructuring support
    this.isValid = this.isValid.bind(this);
    this.getMessages = this.getMessages.bind(this);
    this.getFormattedMessage = this.getFormattedMessage.bind(this);
  }

  async isValid<T = any>(
    formData: T,
    callback?: (isValid: boolean, error?: Error) => void,
  ): Promise<boolean> {
    try {
      const result = await this._performValidation(formData);

      if (callback) {
        queueMicrotask(() => callback(result.isValid, result.error));
      }

      return result.isValid;
    } catch (error) {
      if (callback) {
        queueMicrotask(() => callback(false, error as Error));
      }

      // re-throw critical errors only
      const message = (error as Error).message;
      if (
        message.includes("timeout") ||
        message.includes("Validation failed for field:")
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

    if (!this.options.timeout || this.options.timeout <= 0) {
      return validationPromise;
    }

    return Promise.race([
      validationPromise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`Validation timeout after ${this.options.timeout}ms`),
            ),
          this.options.timeout,
        ),
      ),
    ]);
  }

  private async _executeValidation<T = any>(
    formData: T,
  ): Promise<AllValidationResult> {
    let value = this._getFieldValue(formData);
    const messages: string[] = [];

    // Initialize transformed data with original form data
    this.transformedData = JSON.parse(JSON.stringify(formData));

    try {
      for (const call of this.validationCalls) {
        if (call.type === "transformer") {
          // Apply transformer and update value
          value = await call.fn(value, ...call.args);
          // Update the transformed data cache - setByPath returns a new object
          this.transformedData = setByPath(
            this.transformedData,
            this.fieldPath,
            value,
          );
        } else {
          // Apply validator
          const result = await call.fn(value, ...call.args);
          if (result !== true) {
            messages.push(
              typeof result === "string"
                ? result
                : `Validation failed for ${call.name}`,
            );
          }
        }
      }

      // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
      return (this.lastValidationResult = {
        isValid: messages.length === 0,
        messages,
      });
    } catch (error) {
      const errorResult = {
        isValid: false,
        messages: [`Validation error: ${(error as Error).message}`],
        error: error as Error,
      };

      this.options.onValidationError?.(error as Error, {
        fn: () => false,
        args: [],
      });
      // biome-ignore lint/suspicious/noAssignInExpressions: performance
      return (this.lastValidationResult = errorResult);
    }
  }

  private _getFieldValue<T = any>(formData: T): any {
    const value = getByPath(formData, this.fieldPath);

    if (value !== undefined || !this.fieldPath.includes(".")) {
      return value;
    }

    // Validate dotted path exists
    const pathParts = this.fieldPath.split(".");
    let current = formData;

    for (let i = 0; i < pathParts.length; i++) {
      if (current == null) {
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
    return current;
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
    return (
      this.messageFormatter?.(
        this.lastValidationResult.messages,
        defaultFormatter,
      ) || defaultFormatter(this.lastValidationResult.messages)
    );
  }

  getData(): any {
    return this.transformedData;
  }

  getValue(path: string): any {
    if (this.transformedData === undefined) {
      throw new Error(
        "No transformed data available. Call isValid() first to execute validation and transformers.",
      );
    }
    return getByPath(this.transformedData, path);
  }

  // biome-ignore lint/suspicious/noThenProperty: Required for custom promise-chain behavior
  then<TResult1 = boolean, TResult2 = never>(
    onfulfilled?:
      | ((value: Rules<ET>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    // for thenable behavior, resolve immediately with the chain itself
    return Promise.resolve(this as any).then(onfulfilled as any, onrejected);
  }
}

function chainFn(
  this: Rules,
  fn: ValidatorFn,
  type: "validator" | "transformer",
  ...args: any[]
): Rules {
  this.validationCalls.push(
    new Call(
      fn.name || type,
      (value) => Promise.resolve(fn(value, ...args)),
      args,
      type,
    ) as Call,
  );
  return this;
}

// Dynamically add validator methods to prototype
for (const [validatorName, validatorFn] of Object.entries(validators)) {
  if (typeof validatorFn === "function") {
    (Rules.prototype as any)[validatorName] = function (
      this: Rules,
      ...args: any[]
    ) {
      return chainFn.call(
        this,
        validatorFn as ValidatorFn,
        "validator",
        ...args,
      );
    };
  }
}

// Dynamically add transformer methods to prototype
for (const [transformerName, transformerFn] of Object.entries(transformers)) {
  if (typeof transformerFn === "function") {
    (Rules.prototype as any)[transformerName] = function (
      this: Rules,
      ...args: any[]
    ) {
      return chainFn.call(
        this,
        transformerFn as ValidatorFn,
        "transformer",
        ...args,
      );
    };
  }
}

export function rule(
  fieldPath: string,
  options?: ValidationChainOptions,
): ValidationChainApi<Rules> {
  return new Rules(fieldPath, options) as unknown as ValidationChainApi<Rules>;
}

export function transval(...args: (Rules | Rules[])[]): {
  isValid: <T = any>(
    formData: T,
    callback?: (isValid: boolean, error?: Error) => void,
  ) => Promise<boolean>;
  getMessages: () => string[];
  getFormattedMessage: () => string;
} {
  const chains = Array.isArray(args[0])
    ? args[0]
    : (args.filter(
        (arg) => arg && typeof arg === "object" && "fieldPath" in arg,
      ) as Rules[]);

  return {
    async isValid<T = any>(
      formData: T,
      callback?: (isValid: boolean, error?: Error) => void,
    ): Promise<boolean> {
      try {
        const results = await Promise.all(
          chains.map((chain) => chain.isValid(formData)),
        );
        const isValid = results.every(Boolean);

        if (callback) {
          queueMicrotask(() => callback(isValid));
        }

        return isValid;
      } catch (error) {
        if (callback) {
          queueMicrotask(() => callback(false, error as Error));
        }

        const message = (error as Error).message;
        if (
          message.includes("timeout") ||
          message.includes("Validation failed for field:")
        ) {
          throw error;
        }
        return false;
      }
    },

    getMessages: () => chains.flatMap((chain) => chain.getMessages()),

    getFormattedMessage(): string {
      const allMessages = chains.flatMap((chain) => chain.getMessages());
      const defaultFormatter = (msgs: string[]) => msgs.join(", ");
      const formatterChain = chains.find((chain) => chain.messageFormatter);
      return (
        formatterChain?.messageFormatter?.(allMessages, defaultFormatter) ||
        defaultFormatter(allMessages)
      );
    },
  };
}

rule.extend = <ET extends new (...args: any[]) => any>(ExtensionClass: ET) => {
  const extensionMethods = Object.getOwnPropertyNames(
    ExtensionClass.prototype,
  ).filter(
    (name) =>
      name !== "constructor" &&
      !Object.getOwnPropertyNames(Rules.prototype).includes(name) &&
      typeof ExtensionClass.prototype[name] === "function",
  );

  extensionMethods.forEach((methodName) => {
    (Rules.prototype as any)[methodName] = function (
      this: Rules,
      ...args: any[]
    ) {
      // Get the function from the extension class
      const extensionFn = ExtensionClass.prototype[methodName].bind(this)(
        ...args,
      );

      // Determine if it's a transformer or validator by checking the method name
      // Transformers follow the "as*" naming convention (asNumber, asString, etc.)
      // We check for "as" followed by an uppercase letter to avoid false positives like "asyncEmailCheck"
      const isTransformer = /^as[A-Z]/.test(methodName);

      // For extension methods, the extensionFn is already the validator/transformer function
      // that takes (value) as parameter, so we don't pass additional args to it in chainFn
      return chainFn.call(
        this,
        extensionFn,
        isTransformer ? "transformer" : "validator",
      );
    };
  });

  const extendedValidationChain = (
    fieldPath: string,
    options?: ValidationChainOptions,
  ) =>
    new Rules(fieldPath, options) as unknown as ValidationChainApi<
      InstanceType<ET>
    > &
      InstanceType<ET>;

  extendedValidationChain.extend = rule.extend;
  return extendedValidationChain;
};

export type ExtendedValidationChain<T> = Rules & T;
