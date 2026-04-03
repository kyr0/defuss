/** Header map extracted from an error response for debugging. */
export type ErrorHeaders = Record<string, string>;

/** Extended `Error` with HTTP status, parsed API error fields, and request ID. */
export type OpenAIError = Error & {
  status?: number;
  headers?: ErrorHeaders;
  error?: unknown;
  code?: string | null;
  param?: string | null;
  type?: string | null;
  requestId?: string | null;
  cause?: unknown;
};

/** Coerces any thrown value into a proper `Error` instance (JSON-stringifies objects). */
export const castToError = (value: unknown): Error => {
  if (value instanceof Error) return value;
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
};

/** Base factory for all client errors. Stamps `name: 'OpenAIError'` and merges extra fields. */
export const createOpenAIError = (
  message: string,
  extra: Partial<OpenAIError> = {}
): OpenAIError => {
  const error = new Error(message) as OpenAIError;
  error.name = 'OpenAIError';
  Object.assign(error, extra);
  return error;
};

/**
 * Builds a structured error from an HTTP response. Extracts `code`, `param`,
 * `type`, and `x-request-id` from the API's JSON error body when present,
 * prefixes the message with the status code for quick triage.
 */
export const createAPIError = (args: {
  status?: number;
  headers?: ErrorHeaders;
  error?: unknown;
  message?: string;
  cause?: unknown;
}): OpenAIError => {
  const payload = isRecord(args.error) ? args.error : undefined;
  const message =
    args.message ??
    readErrorMessage(payload) ??
    (args.status ? `${args.status} status code (no body)` : 'API error.');

  return createOpenAIError(
    args.status ? `${args.status} ${message}` : message,
    {
      status: args.status,
      headers: args.headers,
      error: args.error,
      code: readString(payload?.code),
      param: readString(payload?.param),
      type: readString(payload?.type),
      requestId: args.headers?.['x-request-id'] ?? null,
      cause: args.cause,
    }
  );
};

/** Network-level failure (DNS, refused, reset) - no HTTP status available. */
export const createConnectionError = (
  cause?: unknown,
  message = 'Connection error.'
): OpenAIError => createOpenAIError(message, { cause });

/** Fired when the per-request timeout (`AbortController`) triggers before a response. */
export const createConnectionTimeoutError = (
  cause?: unknown,
  message = 'Request timed out.'
): OpenAIError => createOpenAIError(message, { cause });

/** Caller cancelled the request via the `signal` option. */
export const createUserAbortError = (
  cause?: unknown,
  message = 'Request was aborted.'
): OpenAIError => createOpenAIError(message, { cause });

/** Detects the browser/Node `AbortError` by name - works across realms. */
export const isAbortError = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false;
  return 'name' in value && value.name === 'AbortError';
};

/** Narrow `unknown` to a plain object for safe property access. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Returns the value as-is if it's a string, `null` otherwise. */
const readString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

/** Safely pulls `.message` from an API error body, stringifying non-string values. */
const readErrorMessage = (error: Record<string, unknown> | undefined) => {
  const message = error?.message;
  if (typeof message === 'string') return message;
  if (message == null) return undefined;
  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
};
