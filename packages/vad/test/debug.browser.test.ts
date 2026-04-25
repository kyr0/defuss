/**
 * Minimal diagnostic browser test to isolate why tests don't collect.
 */
import { describe, it, expect } from "vitest";

describe("Browser Debug", () => {
	it("trivial test", () => {
		expect(1 + 1).toBe(2);
	});

	it("dynamic import tenvad-web", async () => {
		try {
			const mod = await import("defuss-vad/tenvad-web");
			expect(mod.createVAD).toBeTypeOf("function");
		} catch (e) {
			console.error("Import failed:", e);
			throw e;
		}
	});
});
