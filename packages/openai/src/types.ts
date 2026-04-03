export type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

export type RequestHeaders = HeadersInit;

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

export type RequestOptions = {
  headers?: RequestHeaders;
  signal?: AbortSignal;
  fetch?: typeof fetch;
  timeout?: number;
  maxRetries?: number;
};

export type Role =
  | 'system'
  | 'developer'
  | 'user'
  | 'assistant'
  | 'function'
  | 'tool';

export type FunctionCall = {
  name: string;
  arguments: string;
};

export type ToolCall = {
  id: string;
  type: 'function';
  function: FunctionCall;
};

export type FunctionDefinition = {
  name: string;
  description?: string;
  parameters?: JSONValue;
  strict?: boolean;
};

export type ChatTool = {
  type: 'function';
  function: FunctionDefinition;
};

export type ChatContentPartText = {
  type: 'text';
  text: string;
};

export type ChatContentPartImage = {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'auto' | 'low' | 'high' | string;
  };
};

export type ChatContentPartInputAudio = {
  type: 'input_audio';
  input_audio: {
    data: string;
    format: 'wav' | 'mp3' | string;
  };
};

export type ChatContentPart =
  | ChatContentPartText
  | ChatContentPartImage
  | ChatContentPartInputAudio;

export type ChatMessage = {
  role: Role;
  content?: string | ChatContentPart[] | null;
  refusal?: string | null;
  name?: string;
  function_call?: FunctionCall;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

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

export type Usage = {
  prompt_tokens: number;
  completion_tokens?: number;
  total_tokens: number;
  [key: string]: unknown;
};

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

export type ChatCompletionMessage = ChatMessage & {
  content?: string | null;
};

export type ChatChoice = {
  index: number;
  finish_reason?: string | null;
  message: ChatCompletionMessage;
  logprobs?: {
    content?: TokenLogprob[] | null;
    refusal?: TokenLogprob[] | null;
  } | null;
};

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

export type ChatChunkChoice = {
  index: number;
  finish_reason?: string | null;
  delta: Partial<ChatCompletionMessage>;
  logprobs?: {
    content?: TokenLogprob[] | null;
    refusal?: TokenLogprob[] | null;
  } | null;
};

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

export type ChatStreamParams = ChatParams;
export type ChatStreamResponse = ReadableStream<ChatStreamChunk>;

export type EmbeddingParams = {
  model: string;
  input: string | string[] | number[] | number[][];
  dimensions?: number;
  encoding_format?: 'float' | 'base64';
  user?: string;
  [key: string]: unknown;
};

export type EmbeddingVector = {
  object: 'embedding' | string;
  embedding: number[] | string;
  index: number;
};

export type EmbeddingResponse = {
  object: string;
  model: string;
  data: EmbeddingVector[];
  usage: Usage;
  [key: string]: unknown;
};

export type ModerationParams = {
  input: string | string[] | Array<Record<string, unknown>>;
  model?: string;
  [key: string]: unknown;
};

export type ModerationCategoryScores = Record<string, number>;
export type ModerationCategories = Record<string, boolean>;

export type ModerationResult = {
  flagged: boolean;
  categories: ModerationCategories;
  category_scores: ModerationCategoryScores;
  [key: string]: unknown;
};

export type ModerationResponse = {
  id: string;
  model: string;
  results: ModerationResult[];
  [key: string]: unknown;
};

export type SpeechFormat =
  | 'mp3'
  | 'opus'
  | 'aac'
  | 'flac'
  | 'wav'
  | 'pcm'
  | string;

export type SpeechVoice = string;

export type SpeechParams = {
  model: string;
  input: string;
  voice: SpeechVoice;
  instructions?: string;
  response_format?: SpeechFormat;
  speed?: number;
  [key: string]: unknown;
};

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
