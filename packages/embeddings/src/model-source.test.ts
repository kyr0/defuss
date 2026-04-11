import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_ID } from "./model-source.js";
import { buildNodeCacheKey, getRequiredModelFiles, resolveModelSource } from "./model-source.js";

describe("model-source", () => {
  it("resolves Hugging Face repo ids unchanged", () => {
    const source = resolveModelSource(DEFAULT_MODEL_ID);

    expect(source.kind).toBe("repo");
    expect(source.modelId).toBe(DEFAULT_MODEL_ID);
  });

  it("resolves URL sources to synthetic stable model ids", () => {
    const source = resolveModelSource("https://cdn.example.com/models/harrier");

    expect(source.kind).toBe("url");
    expect(source.modelId.startsWith("defuss-embeddings/")).toBe(true);
    expect(source.remoteHost).toBe("https://cdn.example.com/");
    expect(source.remotePathTemplate).toBe("models/harrier/");
  });

  it("maps dtype to the required multi-file model asset set", () => {
    expect(getRequiredModelFiles(DEFAULT_MODEL_ID, "fp32")).toContain("onnx/model.onnx");
    expect(getRequiredModelFiles("https://cdn.example.com/models/harrier", "q4")).toContain("onnx/model_q4.onnx");
  });

  it("uses the synthetic model id for node cache keys", () => {
    const source = resolveModelSource("https://cdn.example.com/models/harrier");
    const cacheKey = buildNodeCacheKey(source, "config.json");

    expect(cacheKey.startsWith(source.modelId)).toBe(true);
    expect(cacheKey.endsWith("config.json")).toBe(true);
  });
});
