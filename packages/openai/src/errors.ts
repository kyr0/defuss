export type ErrorHeaders = Record<string, string>;

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

export const castToError = (value: unknown): Error => {
  if (value instanceof Error) return value;
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
};

export const createOpenAIError = (
  message: string,
  extra: Partial<OpenAIError> = {}
): OpenAIError => {
  const error = new Error(message) as OpenAIError;
  error.name = 'OpenAIError';
  Object.assign(error, extra);
  return error;
};

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

export const createConnectionError = (
  cause?: unknown,
  message = 'Connection error.'
): OpenAIError => createOpenAIError(message, { cause });

export const createConnectionTimeoutError = (
  cause?: unknown,
  message = 'Request timed out.'
): OpenAIError => createOpenAIError(message, { cause });

export const createUserAbortError = (
  cause?: unknown,
  message = 'Request was aborted.'
): OpenAIError => createOpenAIError(message, { cause });

export const isAbortError = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false;
  return 'name' in value && value.name === 'AbortError';
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

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
