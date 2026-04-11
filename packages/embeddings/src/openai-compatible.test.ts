import { describe, expect, it, vi } from "vitest";
import { DefussEmbeddingClient } from "./client.js";

describe("OpenAI-compatible embedding endpoints", () => {
  it("embeds batches through an OpenAI-compatible endpoint", async () => {
    const fetchSpy = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          data: [
            { index: 1, embedding: [0, 3, 4] },
            { index: 0, embedding: [3, 0, 4] },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    const client = new DefussEmbeddingClient({
      model: "text-embedding-3-small",
      openAICompatible: {
        baseUrl: "https://embeddings.example.com/v1",
        apiKey: "secret-token",
        headers: { "X-Test": "1" },
        fetch: fetchSpy,
      },
    });

    const embeddings = await client.embed(["alpha", "beta"]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchSpy.mock.calls[0]!;
    expect(String(requestUrl)).toBe("https://embeddings.example.com/v1/embeddings");

    const headers = new Headers((requestInit as RequestInit).headers);
    expect(headers.get("authorization")).toBe("Bearer secret-token");
    expect(headers.get("x-test")).toBe("1");

    const body = JSON.parse(String((requestInit as RequestInit).body));
    expect(body).toMatchObject({
      model: "text-embedding-3-small",
      input: ["alpha", "beta"],
    });

    expect(embeddings).toHaveLength(2);
    expect(embeddings[0]![0]).toBeCloseTo(0.6, 6);
    expect(embeddings[0]![1]).toBeCloseTo(0, 6);
    expect(embeddings[0]![2]).toBeCloseTo(0.8, 6);
    expect(embeddings[1]![0]).toBeCloseTo(0, 6);
    expect(embeddings[1]![1]).toBeCloseTo(0.6, 6);
    expect(embeddings[1]![2]).toBeCloseTo(0.8, 6);
  });

  it("allows raw query mode for non-Harrier endpoints", async () => {
    let observedInput = "";
    const fetchSpy = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String((init as RequestInit).body));
      observedInput = String(body.input);

      return new Response(
        JSON.stringify({ data: [{ index: 0, embedding: [1, 0, 0] }] }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    const client = new DefussEmbeddingClient({
      model: "text-embedding-3-small",
      openAICompatible: {
        endpoint: "https://embeddings.example.com/custom/embeddings",
        fetch: fetchSpy,
      },
    });

    await client.embedQuery("How do I create a Python virtual environment?", {
      instruction: "",
    });

    expect(observedInput).toBe("How do I create a Python virtual environment?");
  });

  it("disables local model cache operations for OpenAI-compatible endpoints", async () => {
    const client = new DefussEmbeddingClient({
      model: "text-embedding-3-small",
      openAICompatible: {
        endpoint: "https://embeddings.example.com/custom/embeddings",
        fetch: vi.fn(),
      },
    });

    await expect(client.prefetchModel()).rejects.toThrow(
      "prefetchModel is unavailable when using an OpenAI-compatible embedding endpoint.",
    );
    await expect(client.inspectModelCache()).rejects.toThrow(
      "inspectModelCache is unavailable when using an OpenAI-compatible embedding endpoint.",
    );
    await expect(client.clearModelCache()).rejects.toThrow(
      "clearModelCache is unavailable when using an OpenAI-compatible embedding endpoint.",
    );
  });
});