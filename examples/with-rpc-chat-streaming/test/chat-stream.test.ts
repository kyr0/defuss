import { describe, it, expect } from "vitest";
import { getRpcClient, clearSchemaCache } from "defuss-rpc/client.js";
import { rpcBaseUrl } from "virtual:defuss-rpc";
import type ChatRpc from "../src/rpc.js";

describe("Chat Streaming RPC", () => {
  it("should call ping (non-generator method)", async () => {
    clearSchemaCache();
    const rpc = await getRpcClient<typeof ChatRpc>({ baseUrl: rpcBaseUrl });
    const result = await rpc.ChatApi.ping();
    expect(result).toBe("pong");
  });

  it("should stream words from streamMessage generator", async () => {
    clearSchemaCache();
    const rpc = await getRpcClient<typeof ChatRpc>({ baseUrl: rpcBaseUrl });
    const chunks: string[] = [];

    const gen = rpc.ChatApi.streamMessage("Hello");
    for await (const chunk of gen) {
      chunks.push(chunk);
    }

    // Should have received multiple chunks
    expect(chunks.length).toBeGreaterThan(1);

    // Each chunk should be a non-empty string
    for (const c of chunks) {
      expect(typeof c).toBe("string");
      expect(c.length).toBeGreaterThan(0);
    }

    // Joined chunks should form the full response
    const full = chunks.join(" ");
    expect(full).toContain("simulated AI chat response");
  });
});
