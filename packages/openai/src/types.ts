/** Recursive JSON-safe value type used for function parameters and metadata. */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

/** Alias for `HeadersInit` - accepted in both client config and per-request options. */
export type RequestHeaders = HeadersInit;

/**
 * Configuration for `createClient`. All fields optional - falls back to env
 * vars and sensible defaults. `baseUrl` enables local/custom inference servers.
 */
export type ClientConfig = {
  apiKey?: string;
  organization?: string;
  project?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: RequestHeaders;
  timeout?: number;
  maxRetries?: number;
};

/** Per-request overrides: custom headers, abort signal, timeout, retries, or fetch impl. */
export type RequestOptions = {
  headers?: RequestHeaders;
  signal?: AbortSignal;
  fetch?: typeof fetch;
  timeout?: number;
  maxRetries?: number;
};

/** All message roles recognized by the chat completions API. */
export type Role =
  | 'system'
  | 'developer'
  | 'user'
  | 'assistant'
  | 'function'
  | 'tool';

/** A function invocation returned by the model - `arguments` is a JSON string. */
export type FunctionCall = {
  name: string;
  arguments: string;
};

/** Tool call emitted by the model. The `id` is referenced when returning results. */
export type ToolCall = {
  id: string;
  type: 'function';
  function: FunctionCall;
};

/** Schema for a callable function exposed to the model via the `tools` parameter. */
export type FunctionDefinition = {
  name: string;
  description?: string;
  parameters?: JSONValue;
  strict?: boolean;
};

/** A tool definition passed in `ChatParams.tools`. Currently only `function` type. */
export type ChatTool = {
  type: 'function';
  function: FunctionDefinition;
};

/** Text segment in a multimodal content array. */
export type ChatContentPartText = {
  type: 'text';
  text: string;
};

/** Image segment in a multimodal content array - URL or base64, with detail level. */
export type ChatContentPartImage = {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'auto' | 'low' | 'high' | string;
  };
};

/** Audio segment in a multimodal content array - base64-encoded wav/mp3. */
export type ChatContentPartInputAudio = {
  type: 'input_audio';
  input_audio: {
    data: string;
    format: 'wav' | 'mp3' | string;
  };
};

/** Union of all multimodal content part types for chat messages. */
export type ChatContentPart =
  | ChatContentPartText
  | ChatContentPartImage
  | ChatContentPartInputAudio;

/** A single message in the conversation. Supports text, multimodal, and tool results. */
export type ChatMessage = {
  role: Role;
  content?: string | ChatContentPart[] | null;
  refusal?: string | null;
  name?: string;
  function_call?: FunctionCall;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

/** Per-token log probability with optional byte-level breakdown. */
export type TokenLogprob = {
  token: string;
  bytes?: number[] | null;
  logprob: number;
  top_logprobs?: Array<{
    token: string;
    bytes?: number[] | null;
    logprob: number;
  }>;
};

/** Token usage counters returned with completions and embeddings. */
export type Usage = {
  prompt_tokens: number;
  completion_tokens?: number;
  total_tokens: number;
  [key: string]: unknown;
};

/** `POST /v1/chat/completions` request body. Index signature allows vendor extensions. */
export type ChatParams = {
  model: string;
  messages: ChatMessage[];
  frequency_penalty?: number;
  function_call?: 'none' | 'auto' | { name: string };
  functions?: FunctionDefinition[];
  logit_bias?: Record<string, number>;
  logprobs?: boolean;
  max_completion_tokens?: number;
  max_tokens?: number;
  metadata?: Record<string, string>;
  n?: number;
  parallel_tool_calls?: boolean;
  presence_penalty?: number;
  response_format?: {
    type: 'text' | 'json_object' | 'json_schema';
    json_schema?: unknown;
  };
  seed?: number;
  service_tier?: string;
  stop?: string | string[] | null;
  stream_options?: {
    include_usage?: boolean;
  };
  temperature?: number;
  tool_choice?:
    | 'none'
    | 'auto'
    | 'required'
    | { type: 'function'; function: { name: string } };
  tools?: ChatTool[];
  top_logprobs?: number;
  top_p?: number;
  user?: string;
  [key: string]: unknown;
};

/** The assistant's message in a non-streaming response - content may be `null` for tool calls. */
export type ChatCompletionMessage = ChatMessage & {
  content?: string | null;
};

/** One completion choice. `finish_reason` indicates why generation stopped. */
export type ChatChoice = {
  index: number;
  finish_reason?: string | null;
  message: ChatCompletionMessage;
  logprobs?: {
    content?: TokenLogprob[] | null;
    refusal?: TokenLogprob[] | null;
  } | null;
};

/** Full non-streaming chat completion response. */
export type ChatResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint?: string | null;
  service_tier?: string | null;
  choices: ChatChoice[];
  usage?: Usage;
  [key: string]: unknown;
};

/** Streaming choice - carries a partial `delta` instead of a full `message`. */
export type ChatChunkChoice = {
  index: number;
  finish_reason?: string | null;
  delta: Partial<ChatCompletionMessage>;
  logprobs?: {
    content?: TokenLogprob[] | null;
    refusal?: TokenLogprob[] | null;
  } | null;
};

/** A single SSE frame from a streaming chat completion. Each chunk carries a `delta`. */
export type ChatStreamChunk = {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint?: string | null;
  choices: ChatChunkChoice[];
  usage?: Usage;
  [key: string]: unknown;
};

/** Streaming request params - identical to `ChatParams`; `stream: true` is added automatically. */
export type ChatStreamParams = ChatParams;
/** Typed `ReadableStream` of SSE chunks for streaming chat completions. */
export type ChatStreamResponse = ReadableStream<ChatStreamChunk>;

/** `POST /v1/embeddings` request body. */
export type EmbeddingParams = {
  model: string;
  input: string | string[] | number[] | number[][];
  dimensions?: number;
  encoding_format?: 'float' | 'base64';
  user?: string;
  [key: string]: unknown;
};

/** A single embedding vector returned by the API. */
export type EmbeddingVector = {
  object: 'embedding' | string;
  embedding: number[] | string;
  index: number;
};

/** Full embeddings response containing one vector per input. */
export type EmbeddingResponse = {
  object: string;
  model: string;
  data: EmbeddingVector[];
  usage: Usage;
  [key: string]: unknown;
};

/** `POST /v1/moderations` request body. */
export type ModerationParams = {
  input: string | string[] | Array<Record<string, unknown>>;
  model?: string;
  [key: string]: unknown;
};

/** Per-category confidence scores from the moderation classifier. */
export type ModerationCategoryScores = Record<string, number>;
/** Per-category boolean flags from the moderation classifier. */
export type ModerationCategories = Record<string, boolean>;

/** Moderation result for a single input - `flagged` is `true` if any category triggers. */
export type ModerationResult = {
  flagged: boolean;
  categories: ModerationCategories;
  category_scores: ModerationCategoryScores;
  [key: string]: unknown;
};

/** Full moderation response containing one result per input. */
export type ModerationResponse = {
  id: string;
  model: string;
  results: ModerationResult[];
  [key: string]: unknown;
};

/** Supported TTS output formats. The string union allows vendor-specific values. */
export type SpeechFormat =
  | 'mp3'
  | 'opus'
  | 'aac'
  | 'flac'
  | 'wav'
  | 'pcm'
  | string;

/** TTS voice identifier - string to allow custom/vendor voices. */
export type SpeechVoice = string;

/** `POST /v1/audio/speech` request body for text-to-speech generation. */
export type SpeechParams = {
  model: string;
  input: string;
  voice: SpeechVoice;
  instructions?: string;
  response_format?: SpeechFormat;
  speed?: number;
  [key: string]: unknown;
};

/** Public API surface returned by `createClient`. Frozen object - no mutable state. */
export type OpenAIClient = {
  createChatCompletion: (
    params: ChatParams,
    options?: RequestOptions
  ) => Promise<ChatResponse>;
  streamChatCompletion: (
    params: ChatStreamParams,
    options?: RequestOptions
  ) => Promise<ChatStreamResponse>;
  createEmbeddings: (
    params: EmbeddingParams,
    options?: RequestOptions
  ) => Promise<EmbeddingResponse>;
  createModeration: (
    params: ModerationParams,
    options?: RequestOptions
  ) => Promise<ModerationResponse>;
  createSpeech: (
    params: SpeechParams,
    options?: RequestOptions
  ) => Promise<Response>;
  createSpeechBuffer: (
    params: SpeechParams,
    options?: RequestOptions
  ) => Promise<ArrayBuffer>;
  createSpeechStream: (
    params: SpeechParams,
    options?: RequestOptions
  ) => Promise<ReadableStream<Uint8Array>>;
};
