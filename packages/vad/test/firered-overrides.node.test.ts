import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { createVAD } from "defuss-vad/firered-node";

import {
	FIRERED_DEFAULT_CACHE_DB_NAME,
	resolveFireRedAssetSources,
} from "../src/firered-assets.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const defaultModelPath = join(
	testDir,
	"..",
	"models",
	"firered",
	"fireredvad_stream_vad_with_cache.onnx",
);
const defaultCmvnPath = join(testDir, "..", "models", "firered", "cmvn.ark");

describe("FireRed override paths (Node.js)", () => {
	it("derives stable cache keys for explicit override URLs", () => {
		const first = resolveFireRedAssetSources({
			modelUrl: "https://example.com/models/fire-red-custom.onnx",
			cmvnUrl: "https://example.com/models/fire-red-custom.cmvn",
		});
		const second = resolveFireRedAssetSources({
			modelUrl: "https://example.com/models/fire-red-custom.onnx",
			cmvnUrl: "https://example.com/models/fire-red-custom.cmvn",
		});

		expect(first.modelUrl).toBe("https://example.com/models/fire-red-custom.onnx");
		expect(first.cmvnUrl).toBe("https://example.com/models/fire-red-custom.cmvn");
		expect(first.cacheDbName).toBe(FIRERED_DEFAULT_CACHE_DB_NAME);
		expect(first.modelCacheKey).toMatch(/^firered\/custom\//);
		expect(first.cmvnCacheKey).toMatch(/^firered\/custom\//);
		expect(first.modelCacheKey).toBe(second.modelCacheKey);
		expect(first.cmvnCacheKey).toBe(second.cmvnCacheKey);
	});

	it("uses an explicit cache prefix for overridden asset URLs", () => {
		const resolved = resolveFireRedAssetSources({
			modelUrl: "https://cdn.example.com/firered/model.onnx",
			cmvnUrl: "https://cdn.example.com/firered/cmvn.ark",
			cacheKey: "docs/browser-demo",
			cacheDbName: "docs-browser-cache",
		});

		expect(resolved.cacheEnabled).toBe(true);
		expect(resolved.cacheDbName).toBe("docs-browser-cache");
		expect(resolved.modelCacheKey).toBe("docs/browser-demo:model");
		expect(resolved.cmvnCacheKey).toBe("docs/browser-demo:cmvn");
	});

	it("resolves explicit asset override paths and cache settings", () => {
		const resolved = resolveFireRedAssetSources({
			modelUrl: defaultModelPath,
			cmvnUrl: defaultCmvnPath,
			cacheKey: "docs/fire-red-local",
			cacheDbName: "docs-fire-red-cache",
			cache: false,
		});

		expect(resolved.modelUrl).toBe(defaultModelPath);
		expect(resolved.cmvnUrl).toBe(defaultCmvnPath);
		expect(resolved.cacheEnabled).toBe(false);
		expect(resolved.cacheDbName).toBe("docs-fire-red-cache");
		expect(resolved.modelCacheKey).toBe("docs/fire-red-local:model");
		expect(resolved.cmvnCacheKey).toBe("docs/fire-red-local:cmvn");
	});

	it("creates FireRed VAD from explicit local override paths", async () => {
		const vad = await createVAD({
			modelUrl: defaultModelPath,
			cmvnUrl: defaultCmvnPath,
			cache: false,
		});

		try {
			const frame = new Int16Array(160);

			const first = await vad.process(frame);
			const second = await vad.process(frame);
			const third = await vad.process(frame);

			expect(first.probability).toBe(0);
			expect(second.probability).toBe(0);
			expect(third.probability).toBeGreaterThanOrEqual(0);
			expect(third.probability).toBeLessThanOrEqual(1);
		} finally {
			await vad.destroy();
		}
	});
});
