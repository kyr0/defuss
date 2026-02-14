import { describe, it, expect, beforeAll } from "vitest";
import { embed } from "./embeddings.js";

// Configuration for local embedding server
// NOTE: These tests require a running OpenAI-compatible embedding server
// For example: ollama serve or llama.cpp server with embedding support
// Server should be running at http://127.0.0.1:1234/v1 with model text-embedding-qwen3-embedding-8b

const EMBEDDING_MODEL = "qwen3-embedding:0.6b";

describe("Embedding API Tests", () => {
  beforeAll(() => {
    console.log("Testing embedding API with OpenAI client");
    console.log(`Using model: ${EMBEDDING_MODEL}`);
  });

  it("should embed a single text", async () => {
    const text = "Hello, world!";
    const response = await embed(
      { model: EMBEDDING_MODEL, input: text },
      {
        baseURL: "http://127.0.0.1:11434/v1",
      },
    );

    expect(response).toBeDefined();
    expect(response.data).toHaveLength(1);
    expect(response.data[0].embedding).toBeInstanceOf(Array);
    expect(response.data[0].embedding.length).toBeGreaterThan(0);
  });

  it("should embed multiple texts in batch", async () => {
    const texts = [
      "First text to embed",
      "Second text to embed",
      "Third text to embed",
    ];

    const response = await embed(
      { model: EMBEDDING_MODEL, input: texts },
      {
        baseURL: "http://127.0.0.1:1234/v1",
      },
    );

    expect(response).toBeDefined();
    expect(response.data).toHaveLength(texts.length);

    for (const item of response.data) {
      expect(item.embedding).toBeInstanceOf(Array);
      expect(item.embedding.length).toBeGreaterThan(0);
    }
  });

  it("should handle large text input", async () => {
    const largeText = "This is a large text. ".repeat(100);

    const response = await embed(
      { model: EMBEDDING_MODEL, input: largeText },
      {
        baseURL: "http://127.0.0.1:1234/v1",
      },
    );

    expect(response).toBeDefined();
    expect(response.data).toHaveLength(1);
    expect(response.data[0].embedding).toBeInstanceOf(Array);
  });

  it("should process concurrent requests", async () => {
    const texts = Array.from(
      { length: 5 },
      (_, i) => `Concurrent text ${i + 1}`,
    );

    const promises = texts.map((text) =>
      embed(
        { model: EMBEDDING_MODEL, input: text },
        {
          baseURL: "http://127.0.0.1:1234/v1",
        },
      ),
    );

    const responses = await Promise.all(promises);

    expect(responses).toHaveLength(texts.length);

    for (const response of responses) {
      expect(response.data).toHaveLength(1);
      expect(response.data[0].embedding).toBeInstanceOf(Array);
    }
  });
});

describe("Vector Utility Tests", () => {
  const sampleVector1 = [1, 2, 3, 4, 5];
  const sampleVector2 = [2, 4, 6, 8, 10];
  const sampleVector3 = [1, 0, 0, 0, 0];

  it("should calculate cosine similarity", () => {
    const cosineSimilarity = (a: number[], b: number[]): number => {
      if (a.length !== b.length) {
        throw new Error("Vector dimensions must match");
      }

      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }

      normA = Math.sqrt(normA);
      normB = Math.sqrt(normB);

      if (normA === 0 || normB === 0) {
        return 0;
      }

      return dotProduct / (normA * normB);
    };

    const similarity = cosineSimilarity(sampleVector1, sampleVector2);
    expect(similarity).toBeGreaterThan(0.99); // These vectors are nearly parallel
    expect(similarity).toBeLessThanOrEqual(1);

    const orthogonalSimilarity = cosineSimilarity(sampleVector1, sampleVector3);
    expect(orthogonalSimilarity).toBeGreaterThan(0);
  });

  it("should calculate Euclidean distance", () => {
    const euclideanDistance = (a: number[], b: number[]): number => {
      if (a.length !== b.length) {
        throw new Error("Vector dimensions must match");
      }

      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
      }

      return Math.sqrt(sum);
    };

    const distance = euclideanDistance(sampleVector1, sampleVector2);
    expect(distance).toBeGreaterThan(0);

    const zeroDistance = euclideanDistance(sampleVector1, sampleVector1);
    expect(zeroDistance).toBe(0);
  });

  it("should normalize vectors", () => {
    const normalize = (vector: number[]): number[] => {
      const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      if (norm === 0) {
        return vector.slice();
      }
      return vector.map((val) => val / norm);
    };

    const normalized = normalize(sampleVector1);
    const magnitude = Math.sqrt(
      normalized.reduce((sum, val) => sum + val * val, 0),
    );

    expect(magnitude).toBeCloseTo(1, 5); // Should be unit vector
  });

  it("should find most similar vectors", () => {
    const cosineSimilarity = (a: number[], b: number[]): number => {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }

      normA = Math.sqrt(normA);
      normB = Math.sqrt(normB);

      return normA > 0 && normB > 0 ? dotProduct / (normA * normB) : 0;
    };

    const findMostSimilar = (
      queryVector: number[],
      vectors: number[][],
      topK = 3,
    ): Array<{ index: number; similarity: number }> => {
      const similarities = vectors.map((vector, index) => ({
        index,
        similarity: cosineSimilarity(queryVector, vector),
      }));

      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
    };

    const queryVector = [1, 1, 1, 1, 1];
    const testVectors = [
      [2, 2, 2, 2, 2], // Most similar
      [1, 0, 0, 0, 0], // Less similar
      [-1, -1, -1, -1, -1], // Opposite
      [1, 1, 1, 1, 1], // Identical
    ];

    const results = findMostSimilar(queryVector, testVectors, 2);

    expect(results).toHaveLength(2);
    expect(results[0].similarity).toBeGreaterThanOrEqual(results[1].similarity);
    expect(results[0].similarity).toBeCloseTo(1); // Should find the identical vector
  });
});
