import type { OpenAICompatibleEmbeddingEndpointOptions } from "./types.js";

interface OpenAICompatibleEmbeddingResponseItem {
  readonly index: number;
  readonly embedding: Float32Array;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const resolveFetch = (
  options: OpenAICompatibleEmbeddingEndpointOptions,
): typeof fetch => {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error(
      "OpenAI-compatible embedding endpoint mode requires a fetch implementation.",
    );
  }

  return fetchImpl;
};

export const resolveOpenAICompatibleEmbeddingsUrl = (
  options: OpenAICompatibleEmbeddingEndpointOptions,
): string => {
  if (options.endpoint) {
    return new URL(options.endpoint).toString();
  }

  if (options.baseUrl) {
    const baseUrl = options.baseUrl.endsWith("/") ? options.baseUrl : `${options.baseUrl}/`;
    return new URL("embeddings", baseUrl).toString();
  }

  throw new Error(
    "openAICompatible requires either endpoint or baseUrl to resolve the embeddings URL.",
  );
};

const buildRequestHeaders = (
  options: OpenAICompatibleEmbeddingEndpointOptions,
): Headers => {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");

  for (const [key, value] of Object.entries(options.headers ?? {})) {
    headers.set(key, value);
  }

  if (options.apiKey && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${options.apiKey}`);
  }

  return headers;
};

const parseEmbeddingVector = (value: unknown, index: number): Float32Array => {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid embedding payload at index ${index}: expected an array.`);
  }

  const embedding = new Float32Array(value.length);
  for (let offset = 0; offset < value.length; offset++) {
    const numeric = Number(value[offset]);
    if (!Number.isFinite(numeric)) {
      throw new Error(
        `Invalid embedding payload at index ${index}: value ${offset} is not numeric.`,
      );
    }
    embedding[offset] = numeric;
  }

  return embedding;
};

const parseEmbeddingResponse = (payload: unknown): Float32Array[] => {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error("Invalid OpenAI-compatible embeddings response: expected a data array.");
  }

  const items: OpenAICompatibleEmbeddingResponseItem[] = payload.data.map((entry, index) => {
    if (Array.isArray(entry)) {
      return {
        index,
        embedding: parseEmbeddingVector(entry, index),
      };
    }

    if (!isRecord(entry)) {
      throw new Error(`Invalid embedding payload at index ${index}: expected an object.`);
    }

    return {
      index: typeof entry.index === "number" ? entry.index : index,
      embedding: parseEmbeddingVector(entry.embedding, index),
    };
  });

  items.sort((a, b) => a.index - b.index);
  return items.map((item) => item.embedding);
};

export const fetchOpenAICompatibleEmbeddings = async (
  input: string | string[],
  model: string,
  options: OpenAICompatibleEmbeddingEndpointOptions,
): Promise<Float32Array[]> => {
  const fetchImpl = resolveFetch(options);
  const endpointUrl = resolveOpenAICompatibleEmbeddingsUrl(options);
  const body: Record<string, unknown> = {
    model,
    input,
    ...(options.encodingFormat !== undefined
      ? { encoding_format: options.encodingFormat }
      : {}),
    ...(options.dimensions !== undefined ? { dimensions: options.dimensions } : {}),
    ...(options.user !== undefined ? { user: options.user } : {}),
    ...(options.extraBody ?? {}),
  };

  const response = await fetchImpl(endpointUrl, {
    method: "POST",
    headers: buildRequestHeaders(options),
    body: JSON.stringify(body),
  });

  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(
      `Failed to fetch embeddings from ${endpointUrl} (${response.status}): ${rawBody || response.statusText}`,
    );
  }

  let payload: unknown;
  try {
    payload = rawBody.length > 0 ? JSON.parse(rawBody) : {};
  } catch (error) {
    throw new Error(
      `Invalid JSON from OpenAI-compatible embeddings endpoint ${endpointUrl}: ${(error as Error).message}`,
    );
  }

  return parseEmbeddingResponse(payload);
};