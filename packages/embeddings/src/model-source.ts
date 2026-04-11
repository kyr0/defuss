import type {
  EmbeddingDType,
  ModelLoadOptions,
  ResolvedModelSource,
} from "./types.js";

export const DEFAULT_MODEL_ID = "tss-deposium/harrier-oss-v1-270m-onnx-int8";
export const LEGACY_MODEL_ID = "onnx-community/harrier-oss-v1-270m-ONNX";

const HF_MODEL_ID_REGEX = /^(\b[\w.-]+\b\/)?\b[\w.-]{1,96}\b$/;

export const DEFAULT_MODEL_REMOTE_HOST = "https://huggingface.co/";
export const DEFAULT_MODEL_REMOTE_PATH_TEMPLATE = "{model}/resolve/{revision}/";
export const DEFAULT_TRANSFORMERS_CACHE_NAME = "transformers-cache";

const KNOWN_MODEL_REQUIRED_FILES: Record<string, readonly string[]> = {
  [DEFAULT_MODEL_ID]: [
    "config.json",
    "search_instructions.json",
    "special_tokens_map.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "onnx/model.onnx",
  ],
  [LEGACY_MODEL_ID]: [
    "config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "onnx/model_q4.onnx",
    "onnx/model_q4.onnx_data",
  ],
};

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const isValidHfModelId = (value: string): boolean => {
  if (!HF_MODEL_ID_REGEX.test(value)) return false;
  if (value.includes("..") || value.includes("--")) return false;
  if (value.endsWith(".git") || value.endsWith(".ipynb")) return false;
  return true;
};

const hashString = (input: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const trimSlashes = (input: string): string => input.replace(/^\/+|\/+$/g, "");

export const pathJoin = (...parts: string[]): string => {
  return parts
    .map((part, index) => {
      let next = part;
      if (index > 0) {
        next = next.replace(/^\//, "");
      }
      if (index !== parts.length - 1) {
        next = next.replace(/\/$/, "");
      }
      return next;
    })
    .join("/");
};

export const resolveModelSource = (
  urlOrRepoId: string,
  options: ModelLoadOptions = {},
): ResolvedModelSource => {
  const revision = options.revision ?? "main";

  if (isHttpUrl(urlOrRepoId)) {
    const url = new URL(urlOrRepoId);
    if (url.search.length > 0 || url.hash.length > 0) {
      throw new Error(
        "URL model sources must point to a stable base path without query parameters or fragments.",
      );
    }

    const syntheticId = options.cacheKey ?? `defuss-embeddings/${hashString(url.toString())}`;
    return {
      kind: "url",
      input: url.toString().replace(/\/$/, ""),
      modelId: syntheticId,
      revision,
      remoteHost: options.remoteHost ?? `${url.origin}/`,
      remotePathTemplate:
        options.remotePathTemplate ?? `${trimSlashes(url.pathname)}/`,
    };
  }

  if (!isValidHfModelId(urlOrRepoId)) {
    throw new Error(`Invalid model source: ${urlOrRepoId}`);
  }

  return {
    kind: "repo",
    input: urlOrRepoId,
    modelId: urlOrRepoId,
    revision,
    remoteHost: options.remoteHost ?? DEFAULT_MODEL_REMOTE_HOST,
    remotePathTemplate: options.remotePathTemplate ?? DEFAULT_MODEL_REMOTE_PATH_TEMPLATE,
  };
};

export const buildRemoteModelFileUrl = (
  source: ResolvedModelSource,
  fileName: string,
): string => {
  return pathJoin(
    source.remoteHost,
    source.remotePathTemplate
      .replaceAll("{model}", source.input)
      .replaceAll("{revision}", encodeURIComponent(source.revision)),
    fileName,
  );
};

export const buildNodeCacheKey = (
  source: ResolvedModelSource,
  fileName: string,
): string => {
  return source.revision === "main"
    ? pathJoin(source.modelId, fileName)
    : pathJoin(source.modelId, source.revision, fileName);
};

export const getRequiredModelFiles = (
  modelSource: string | ResolvedModelSource,
  dtype: EmbeddingDType,
  requiredFiles?: readonly string[],
): string[] => {
  if (requiredFiles && requiredFiles.length > 0) {
    return [...requiredFiles];
  }

  const candidates =
    typeof modelSource === "string"
      ? [modelSource]
      : [modelSource.input, modelSource.modelId];

  for (const candidate of candidates) {
    if (candidate in KNOWN_MODEL_REQUIRED_FILES) {
      return [...KNOWN_MODEL_REQUIRED_FILES[candidate]!];
    }
  }

  const onnxBaseName =
    dtype === "fp32"
      ? "model"
      : dtype === "fp16"
        ? "model_fp16"
        : dtype === "q4"
          ? "model_q4"
          : dtype === "q4f16"
            ? "model_q4f16"
            : "model_quantized";

  return [
    "config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    `onnx/${onnxBaseName}.onnx`,
    `onnx/${onnxBaseName}.onnx_data`,
  ];
};
