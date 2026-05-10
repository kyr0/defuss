import { describe, it, expect } from "vitest";
import { getRpcClient, clearSchemaCache } from "defuss-rpc/client.js";
import { rpcBaseUrl } from "virtual:defuss-rpc";
import type { RpcApi } from "../src/rpc.js";

describe("Chat Streaming RPC", () => {
	it("should call ping (non-generator method)", async () => {
		clearSchemaCache();
		const rpc = await getRpcClient<RpcApi>({ baseUrl: rpcBaseUrl });
		const chatApi = new rpc.ChatApi();
		const result = await chatApi.ping();
		expect(result).toBe("pong");
	});

	it("should stream tokens from streamChat generator", async () => {
		clearSchemaCache();
		const rpc = await getRpcClient<RpcApi>({ baseUrl: rpcBaseUrl });
		const chatApi = new rpc.ChatApi();
		const chunks: string[] = [];

		const gen = chatApi.streamChat(
			[{ role: "user", content: "Say hello in exactly 3 words" }],
			{ temperature: 0 },
		);

		for await (const chunk of gen) {
			chunks.push(chunk);
		}

		// Should have received at least one chunk (or an error message if no API key)
		expect(chunks.length).toBeGreaterThan(0);

		// Each chunk should be a non-empty string
		for (const c of chunks) {
			expect(typeof c).toBe("string");
			expect(c.length).toBeGreaterThan(0);
		}
	});
});
