export type Vector = Float32Array;
export type Vectors = ReadonlyArray<Float32Array>;
export type EmbeddingDType = "q4" | "q4f16" | "q8" | "fp16" | "fp32";
export type EmbeddingDevice = "wasm" | "webgpu" | "cpu" | string;
export type PoolingStrategy = "mean" | "none" | "last_token";
export type QueryInstructionPreset = "web_search_query" | "sts_query" | "bitext_query";
export type ModelSourceKind = "repo" | "url";
export type ModelCacheLocation = "filesystem" | "browser-cache" | "browser-db";

export interface OpenAICompatibleEmbeddingEndpointOptions {
  endpoint?: string;
  baseUrl?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  dimensions?: number;
  encodingFormat?: string;
  user?: string;
  extraBody?: Record<string, unknown>;
  model?: string;
  fetch?: typeof fetch;
}

export interface TensorLike {
  readonly data: ArrayLike<number>;
  readonly dims: readonly number[];
  readonly type?: string;
}

export interface FeatureExtractorLike {
  (input: string | string[], options?: Record<string, unknown>): Promise<TensorLike>;
}

export interface TransformersEnvLike {
  allowRemoteModels?: boolean;
  allowLocalModels?: boolean;
  localModelPath?: string;
  cacheDir?: string | null;
  remoteHost?: string;
  remotePathTemplate?: string;
  useBrowserCache?: boolean;
  useFSCache?: boolean;
  useFS?: boolean;
  logLevel?: number;
}

export interface ModelLoadOptions {
  revision?: string;
  cacheKey?: string;
  remoteHost?: string;
  remotePathTemplate?: string;
  requiredFiles?: readonly string[];
}

export interface ResolvedModelSource {
  readonly kind: ModelSourceKind;
  readonly input: string;
  readonly modelId: string;
  readonly revision: string;
  readonly remoteHost: string;
  readonly remotePathTemplate: string;
}

export interface ModelPrefetchOptions extends ModelLoadOptions {
  dtype?: EmbeddingDType;
  cacheDir?: string | null;
}

export interface ModelCacheOptions extends ModelPrefetchOptions {}

export interface ModelPrefetchFile {
  readonly fileName: string;
  readonly remoteUrl: string;
  readonly cacheKey: string;
}

export interface ModelPrefetchResult {
  readonly source: ResolvedModelSource;
  readonly files: readonly ModelPrefetchFile[];
}

export interface ModelCacheFileStatus {
  readonly fileName: string;
  readonly remoteUrl: string;
  readonly cacheKey: string;
  readonly locations: readonly ModelCacheLocation[];
}

export interface ModelCacheInspectionResult {
  readonly source: ResolvedModelSource;
  readonly files: readonly ModelCacheFileStatus[];
}

export interface ModelCacheClearFileResult extends ModelCacheFileStatus {
  readonly removedFrom: readonly ModelCacheLocation[];
}

export interface ModelCacheClearResult {
  readonly source: ResolvedModelSource;
  readonly files: readonly ModelCacheClearFileResult[];
}

export interface TransformersModuleLike {
  pipeline: (
    task: "feature-extraction",
    model: string,
    options?: Record<string, unknown>,
  ) => Promise<FeatureExtractorLike>;
  env: TransformersEnvLike;
}

export interface EmbedderInitOptions {
  model?: string;
  dtype?: EmbeddingDType;
  device?: EmbeddingDevice;
  pooling?: PoolingStrategy;
  normalize?: boolean;
  warmCacheOnLoad?: boolean;
  requiredFiles?: readonly string[];
  revision?: string;
  cacheDir?: string | null;
  allowLocalModels?: boolean;
  allowRemoteModels?: boolean;
  localModelPath?: string;
  useBrowserCache?: boolean;
  useFSCache?: boolean;
  useFS?: boolean;
  logLevel?: number;
  pipelineFactory?: TransformersModuleLike["pipeline"];
  moduleFactory?: () => Promise<TransformersModuleLike>;
  openAICompatible?: OpenAICompatibleEmbeddingEndpointOptions;
}

export interface EmbedOptions {
  pooling?: PoolingStrategy;
  normalize?: boolean;
}

export interface QueryEmbedOptions extends EmbedOptions {
  instruction?: string;
  preset?: QueryInstructionPreset;
}

export interface Embedder {
  model: string;
  readonly dtype: EmbeddingDType;
  readonly device?: EmbeddingDevice;
  embed(input: string | string[], options?: EmbedOptions): Promise<Float32Array[]>;
  embedDocuments(input: string | string[], options?: EmbedOptions): Promise<Float32Array[]>;
  embedOne(input: string, options?: EmbedOptions): Promise<Float32Array>;
  embedQuery(input: string, options?: QueryEmbedOptions): Promise<Float32Array>;
  embedQueries(input: readonly string[], options?: QueryEmbedOptions): Promise<Float32Array[]>;
  loadModel(urlOrRepoId: string, options?: ModelLoadOptions): Promise<void>;
  prefetchModel(urlOrRepoId?: string, options?: ModelPrefetchOptions): Promise<ModelPrefetchResult>;
  inspectModelCache(
    urlOrRepoId?: string,
    options?: ModelCacheOptions,
  ): Promise<ModelCacheInspectionResult>;
  clearModelCache(
    urlOrRepoId?: string,
    options?: ModelCacheOptions,
  ): Promise<ModelCacheClearResult>;
}

export interface SearchHit {
  readonly index: number;
  readonly score: number;
}

export interface SearchResult<TRecord = unknown> extends SearchHit {
  readonly record?: TRecord;
}

export interface TurboQuantSearchIndex {
  readonly size: number;
  readonly dims: number;
  readonly rotatedDims: number;
  readonly codeBytes: number;
  readonly clip: number;
  readonly codebook: Float32Array;
  readonly signs: Int8Array;
  readonly codes: Uint8Array;
}

export interface TurboQuantRerankedSearchHit extends SearchHit {
  readonly approximateScore: number;
}

export interface TurboQuantRerankResult {
  readonly approximateTopK: readonly SearchHit[];
  readonly rerankedTopK: readonly TurboQuantRerankedSearchHit[];
}

export interface BuildTurboQuantIndexOptions {
  clip?: number;
  seed?: number;
}
