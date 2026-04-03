import {
  castToError,
  createAPIError,
  createConnectionError,
  createConnectionTimeoutError,
  createUserAbortError,
  isAbortError,
} from './errors.js';
import { createSSEStream } from './sse.js';
import type { ClientConfig, RequestOptions } from './types.js';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_TIMEOUT = 10 * 60 * 1000;
const DEFAULT_MAX_RETRIES = 2;

export type ResolvedClientConfig = {
  apiKey: string;
  organization?: string;
  project?: string;
  baseUrl: string;
  fetch: typeof fetch;
  headers?: HeadersInit;
  timeout: number;
  maxRetries: number;
};

export const resolveClientConfig = (
  config: ClientConfig = {}
): ResolvedClientConfig => {
  const apiKey = config.apiKey ?? readEnv('OPENAI_API_KEY') ?? '';

  const fetchImpl = config.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('Missing fetch implementation.');
  }

  return {
    apiKey,
    organization: config.organization ?? readEnv('OPENAI_ORG_ID') ?? undefined,
    project: config.project ?? readEnv('OPENAI_PROJECT_ID') ?? undefined,
    baseUrl: normalizeBaseUrl(config.baseUrl ?? DEFAULT_BASE_URL),
    fetch: fetchImpl,
    headers: config.headers,
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
  };
};

export const postJSON = async <T>(args: {
  client: ResolvedClientConfig;
  path: string;
  body: unknown;
  options?: RequestOptions;
}): Promise<T> => {
  const response = await request({
    client: args.client,
    path: args.path,
    body: args.body,
    responseType: 'response',
    options: args.options,
  });
  return (await response.json()) as T;
};

export const postSSE = async <T>(args: {
  client: ResolvedClientConfig;
  path: string;
  body: unknown;
  options?: RequestOptions;
}): Promise<ReadableStream<T>> => {
  const response = await request({
    client: args.client,
    path: args.path,
    body: args.body,
    responseType: 'response',
    headers: {
      Accept: 'text/event-stream',
    },
    options: args.options,
  });

  if (!response.body) {
    throw createConnectionError(undefined, 'Missing response body.');
  }

  return createSSEStream<T>(response.body);
};

export const postResponse = (args: {
  client: ResolvedClientConfig;
  path: string;
  body: unknown;
  headers?: HeadersInit;
  options?: RequestOptions;
}) =>
  request({
    client: args.client,
    path: args.path,
    body: args.body,
    responseType: 'response',
    headers: args.headers,
    options: args.options,
  });

const request = async (args: {
  client: ResolvedClientConfig;
  path: string;
  body?: unknown;
  responseType: 'response';
  headers?: HeadersInit;
  options?: RequestOptions;
}): Promise<Response> => {
  const url = `${args.client.baseUrl}/${stripLeadingSlash(args.path)}`;
  const fetchImpl = args.options?.fetch ?? args.client.fetch;
  const timeout = args.options?.timeout ?? args.client.timeout;
  const maxRetries = args.options?.maxRetries ?? args.client.maxRetries;

  for (let attempt = 0; ; attempt += 1) {
    const requestState = createRequestState(args.options?.signal, timeout);

    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: mergeHeaders(
          {
            ...(args.client.apiKey
              ? { Authorization: `Bearer ${args.client.apiKey}` }
              : undefined),
            'Content-Type': 'application/json',
          },
          args.client.organization
            ? { 'OpenAI-Organization': args.client.organization }
            : undefined,
          args.client.project
            ? { 'OpenAI-Project': args.client.project }
            : undefined,
          args.client.headers,
          args.headers,
          args.options?.headers
        ),
        body: args.body == null ? undefined : JSON.stringify(args.body),
        signal: requestState.signal,
      });

      requestState.cleanup();

      if (!response.ok) {
        if (attempt < maxRetries && shouldRetryResponse(response.status)) {
          await sleep(getRetryDelay(attempt, response));
          continue;
        }

        throw await responseToError(response);
      }

      return response;
    } catch (error) {
      requestState.cleanup();

      if (requestState.timedOut) {
        throw createConnectionTimeoutError(error);
      }

      if (args.options?.signal?.aborted) {
        throw createUserAbortError(error);
      }

      if (attempt < maxRetries && shouldRetryError(error)) {
        await sleep(getRetryDelay(attempt));
        continue;
      }

      if (isAbortError(error)) {
        throw createUserAbortError(error);
      }

      if (isOpenAIError(error)) {
        throw error;
      }

      throw createConnectionError(castToError(error));
    }
  }
};

const responseToError = async (response: Response) => {
  const headers = headersToObject(response.headers);
  const text = await response.text().catch(() => '');
  const json = safeParseJSON(text);
  const error = isRecord(json) && isRecord(json.error) ? json.error : json;

  return createAPIError({
    status: response.status,
    headers,
    error,
    message: typeof error === 'string' ? error : text || undefined,
  });
};

const createRequestState = (signal: AbortSignal | undefined, timeout: number) => {
  const controller = new AbortController();
  let timedOut = false;

  const abortFromSignal = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', abortFromSignal, { once: true });
  }

  const timeoutId =
    timeout > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeout)
      : undefined;

  const cleanup = () => {
    if (timeoutId) clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortFromSignal);
  };

  return {
    signal: controller.signal,
    cleanup,
    get timedOut() {
      return timedOut;
    },
  };
};

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

const stripLeadingSlash = (value: string) => value.replace(/^\/+/, '');

const mergeHeaders = (...values: Array<HeadersInit | undefined>) => {
  const headers = new Headers();

  for (const value of values) {
    if (!value) continue;
    const current = new Headers(value);
    current.forEach((headerValue, headerName) => {
      headers.set(headerName, headerValue);
    });
  }

  return headers;
};

const headersToObject = (headers: Headers) => {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
};

const safeParseJSON = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const getRetryDelay = (attempt: number, response?: Response) => {
  const retryAfter = response?.headers.get('retry-after');
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return retryAfterSeconds * 1000;
  }

  const baseDelay = Math.min(2000, 250 * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 250);
  return baseDelay + jitter;
};

const shouldRetryResponse = (status: number) =>
  status === 408 || status === 409 || status === 429 || status >= 500;

const shouldRetryError = (error: unknown) => {
  if (isAbortError(error)) return false;
  return true;
};

const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const readEnv = (name: string) => {
  const processLike = globalThis as typeof globalThis & {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };
  return processLike.process?.env?.[name];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isOpenAIError = (value: unknown): value is Error =>
  value instanceof Error && value.name === 'OpenAIError';
