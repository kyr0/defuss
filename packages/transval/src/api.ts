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

const defaultFormatter = (msgs: string[]) => msgs.join(", ");

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
  protected _state = { isNegated: false, hasValidators: false };

  constructor(fieldPath: string, options: ValidationChainOptions = {}) {
    this.fieldPath = fieldPath;
    this.validationCalls = [];
    this.lastValidationResult = { isValid: true, messages: [] };
    this.transformedData = undefined;
    this.options = { timeout: 5000, ...options };
    this.isValid = this.isValid.bind(this);
  }

  get not(): ValidationChainApi<ET> & ET {
    const state = this._state;
    if (state.isNegated || state.hasValidators) {
      throw new Error(
        "Multiple negations are not allowed in a validation chain",
      );
    }
    state.isNegated = true;
    return this as unknown as ValidationChainApi<ET> & ET;
  }

  protected _handleValidationError(
    error: Error,
    callback?: (isValid: boolean, error?: Error) => void,
  ): boolean {
    callback && queueMicrotask(() => callback(false, error));
    const message = error.message;
    if (
      message.includes("timeout") ||
      message.includes("Validation failed for field:")
    )
      throw error;
    return false;
  }

  async isValid<T = any>(
    formData: T,
    callback?: (isValid: boolean, error?: Error) => void,
  ): Promise<boolean> {
    try {
      const result = await this._triggerValidation(formData);
      callback && queueMicrotask(() => callback(result.isValid, result.error));
      return result.isValid;
    } catch (error) {
      return this._handleValidationError(error as Error, callback);
    }
  }

  private async _triggerValidation<T = any>(
    formData: T,
  ): Promise<AllValidationResult> {
    const validationPromise = this._executeValidation(formData);
    return !this.options.timeout || this.options.timeout <= 0
      ? validationPromise
      : Promise.race([
          validationPromise,
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Validation timeout after ${this.options.timeout}ms`,
                  ),
                ),
              this.options.timeout,
            ),
          ),
        ]);
  }

  private async _executeValidation<T = any>(
    formData: T,
  ): Promise<AllValidationResult> {
    let currentValue = this._getFieldValue(formData);
    const validationErrors: string[] = [];
    this.transformedData = JSON.parse(JSON.stringify(formData));

    try {
      const calls = this.validationCalls;
      const fieldPath = this.fieldPath;
      let transformedData = this.transformedData;

      for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        const result = await call.fn(currentValue, ...call.args);

        if (call.type === "transformer") {
          transformedData = setByPath(
            transformedData,
            fieldPath,
            // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
            (currentValue = result),
          );
        } else if (result !== true) {
          validationErrors.push(
            typeof result === "string"
              ? result
              : `Validation failed for ${call.name}`,
          );
        }
      }

      this.transformedData = transformedData;
      return this._buildValidationResult(validationErrors);
    } catch (error) {
      return this._buildErrorResult(error as Error);
    }
  }

  private _buildValidationResult(errors: string[]): AllValidationResult {
    const isValid = !errors.length;
    const state = this._state;
    const finalIsValid = state.isNegated ? !isValid : isValid;

    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    return (this.lastValidationResult = {
      isValid: finalIsValid,
      messages:
        state.isNegated && isValid
          ? [...errors, "Validation was expected to fail but passed"]
          : errors,
    });
  }

  private _buildErrorResult(error: Error): AllValidationResult {
    const state = this._state;
    this.options.onValidationError?.(error, { fn: () => false, args: [] });

    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    return (this.lastValidationResult = {
      isValid: state.isNegated,
      messages: state.isNegated ? [] : [`Validation error: ${error.message}`],
      error,
    });
  }

  private _getFieldValue<T = any>(formData: T): any {
    const fieldPath = this.fieldPath;
    const value = getByPath(formData, fieldPath);
    if (value !== undefined || !fieldPath.includes(".")) return value;

    const pathParts = fieldPath.split(".");
    let current = formData;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      if (current == null) {
        throw new Error(
          `Validation failed for field: ${fieldPath} - path not found at '${pathParts.slice(0, i).join(".")}'`,
        );
      }
      if (typeof current !== "object" || !(part in current)) {
        throw new Error(
          `Validation failed for field: ${fieldPath} - field '${part}' not found`,
        );
      }
      current = (current as any)[part];
    }
    return current;
  }

  useFormatter(
    messageFn?: <T = string>(
      messages: string[],
      format: (msgs: string[]) => string,
    ) => T,
  ): ValidationChainApi<ET> & ET {
    if (messageFn) this.messageFormatter = messageFn;
    return this as unknown as ValidationChainApi<ET> & ET;
  }

  protected _formatMessages(messages: string[]): string {
    return (
      this.messageFormatter?.(messages, defaultFormatter) ||
      defaultFormatter(messages)
    );
  }

  getMessages(): string[] {
    return this.lastValidationResult.messages;
  }

  getFormattedMessages<T = string>(): T {
    return this._formatMessages(
      this.lastValidationResult.messages,
    ) as unknown as T;
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
  if (type === "validator") this._state.hasValidators = true;
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

function _addMethodsToPrototype(
  methods: Record<string, any>,
  type: "validator" | "transformer",
) {
  for (const [name, fn] of Object.entries(methods)) {
    if (typeof fn === "function") {
      (Rules.prototype as any)[name] = function (this: Rules, ...args: any[]) {
        return chainFn.call(this, fn as ValidatorFn, type, ...args);
      };
    }
  }
}

// Add all methods with unified approach
_addMethodsToPrototype(validators, "validator");
_addMethodsToPrototype(transformers, "transformer");

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
  getFormattedMessages: <T = string>() => T;
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
        callback && queueMicrotask(() => callback(isValid));
        return isValid;
      } catch (error) {
        callback && queueMicrotask(() => callback(false, error as Error));
        const message = (error as Error).message;
        if (
          message.includes("timeout") ||
          message.includes("Validation failed for field:")
        )
          throw error;
        return false;
      }
    },

    getMessages: () => chains.flatMap((chain) => chain.getMessages()),

    getFormattedMessages: <T>() => {
      const allMessages = chains.flatMap((chain) => chain.getMessages());
      return (chains
        .find((chain) => chain.messageFormatter)
        ?.getFormattedMessages() ?? defaultFormatter(allMessages)) as T;
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
      const extensionFn = ExtensionClass.prototype[methodName].bind(this)(
        ...args,
      );
      const isTransformer = /^as[A-Z]/.test(methodName);

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
