import { describe, it, expect } from "vitest";
import { noopTelemetrySink, METRIC_NAMES } from "./metrics.js";

describe("noopTelemetrySink", () => {
	it("incrementCounter is callable without errors", () => {
		expect(() => noopTelemetrySink.incrementCounter("test", 1)).not.toThrow();
	});

	it("recordHistogram is callable without errors", () => {
		expect(() => noopTelemetrySink.recordHistogram("test", 42)).not.toThrow();
	});

	it("setGauge is callable without errors", () => {
		expect(() => noopTelemetrySink.setGauge("test", 7)).not.toThrow();
	});

	it("accepts optional attributes", () => {
		expect(() =>
			noopTelemetrySink.incrementCounter("test", 1, { env: "prod" }),
		).not.toThrow();
		expect(() =>
			noopTelemetrySink.recordHistogram("test", 1, { env: "prod" }),
		).not.toThrow();
		expect(() =>
			noopTelemetrySink.setGauge("test", 1, { env: "prod" }),
		).not.toThrow();
	});
});

describe("METRIC_NAMES", () => {
	it("contains all expected metric keys", () => {
		const expectedKeys = [
			"scheduledTotal",
			"leasedTotal",
			"startedTotal",
			"completedTotal",
			"failedTotal",
			"retriedTotal",
			"abandonedTotal",
			"redirectTotal",
			"pendingGauge",
			"runningGauge",
			"retryWaitGauge",
			"livePeersGauge",
			"liveWorkersGauge",
			"leaseLatencyMs",
			"workDurationMs",
			"retryDelayMs",
			"persistenceFlushMs",
		];

		for (const key of expectedKeys) {
			expect(METRIC_NAMES).toHaveProperty(key);
		}
	});

	it("values are non-empty strings", () => {
		for (const value of Object.values(METRIC_NAMES)) {
			expect(typeof value).toBe("string");
			expect(value.length).toBeGreaterThan(0);
		}
	});
});
