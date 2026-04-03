import { createConnectionError } from './errors.js';
import { postJSON, postResponse, postSSE, resolveClientConfig } from './request.js';
import type {
  ChatParams,
  ChatResponse,
  ChatStreamChunk,
  ChatStreamParams,
  ClientConfig,
  EmbeddingParams,
  EmbeddingResponse,
  ModerationParams,
  ModerationResponse,
  OpenAIClient,
  RequestOptions,
  SpeechParams,
} from './types.js';

/** Maps TTS output format names to their MIME types for the `Accept` header. */
const AUDIO_MIME_BY_FORMAT: Record<string, string> = {
  mp3: 'audio/mpeg',
  opus: 'audio/opus',
  aac: 'audio/aac',
  flac: 'audio/flac',
  wav: 'audio/wav',
  pcm: 'application/octet-stream',
};

/**
 * Creates a frozen, stateless OpenAI client backed by standard `fetch`.
 *
 * All methods are thin wrappers around `postJSON` / `postSSE` / `postResponse`
 * that map endpoint paths and types. The client carries resolved config (base URL,
 * auth, timeouts) so individual calls only need endpoint-specific params.
 *
 * Works with any OpenAI-compatible server - API key is optional for local
 * inference servers (e.g. bonsai, llama.cpp, vLLM).
 */
export const createClient = (config: ClientConfig = {}): OpenAIClient => {
  const client = resolveClientConfig(config);

  /** Sends a non-streaming chat completion request. */
  const createChatCompletion = (
    params: ChatParams,
    options?: RequestOptions
  ) =>
    postJSON<ChatResponse>({
      client,
      path: 'chat/completions',
      body: params,
      options,
    });

  /** Opens an SSE stream for incremental chat completion tokens. Adds `stream: true` automatically. */
  const streamChatCompletion = (
    params: ChatStreamParams,
    options?: RequestOptions
  ) =>
    postSSE<ChatStreamChunk>({
      client,
      path: 'chat/completions',
      body: { ...params, stream: true },
      options,
    });

  /** Generates vector embeddings for the given input text(s). */
  const createEmbeddings = (
    params: EmbeddingParams,
    options?: RequestOptions
  ) =>
    postJSON<EmbeddingResponse>({
      client,
      path: 'embeddings',
      body: params,
      options,
    });

  /** Classifies input text against OpenAI's content policy categories. */
  const createModeration = (
    params: ModerationParams,
    options?: RequestOptions
  ) =>
    postJSON<ModerationResponse>({
      client,
      path: 'moderations',
      body: params,
      options,
    });

  /** Generates audio from text. Returns the raw `Response` for flexible consumption. */
  const createSpeech = (params: SpeechParams, options?: RequestOptions) =>
    postResponse({
      client,
      path: 'audio/speech',
      body: params,
      headers: {
        Accept: AUDIO_MIME_BY_FORMAT[params.response_format ?? 'mp3'] ?? '*/*',
      },
      options,
    });

  /** Convenience wrapper: generates speech and returns the full audio as an `ArrayBuffer`. */
  const createSpeechBuffer = async (
    params: SpeechParams,
    options?: RequestOptions
  ) => (await createSpeech(params, options)).arrayBuffer();

  /** Returns the raw byte stream from a TTS response for progressive playback. */
  const createSpeechStream = async (
    params: SpeechParams,
    options?: RequestOptions
  ) => {
    const response = await createSpeech(params, options);
    if (!response.body) {
      throw createConnectionError(undefined, 'Missing response body.');
    }
    return response.body;
  };

  return Object.freeze({
    createChatCompletion,
    streamChatCompletion,
    createEmbeddings,
    createModeration,
    createSpeech,
    createSpeechBuffer,
    createSpeechStream,
  });
};

/** @deprecated Alias for `createClient`. Kept for backward compatibility. */
export const createOpenAI = createClient;

/** Namespace object for tree-shakeable named imports. */
export const OpenAI = {
  createClient,
  createOpenAI,
};
