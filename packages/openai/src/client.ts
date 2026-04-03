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

const AUDIO_MIME_BY_FORMAT: Record<string, string> = {
  mp3: 'audio/mpeg',
  opus: 'audio/opus',
  aac: 'audio/aac',
  flac: 'audio/flac',
  wav: 'audio/wav',
  pcm: 'application/octet-stream',
};

export const createClient = (config: ClientConfig = {}): OpenAIClient => {
  const client = resolveClientConfig(config);

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

  const createSpeechBuffer = async (
    params: SpeechParams,
    options?: RequestOptions
  ) => (await createSpeech(params, options)).arrayBuffer();

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

export const createOpenAI = createClient;

export const OpenAI = {
  createClient,
  createOpenAI,
};
