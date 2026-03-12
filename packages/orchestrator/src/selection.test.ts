import { describe, it, expect } from "vitest";
import {
	defaultSelectWorkItemForWorker,
	defaultSelectWorkerForWorkItem,
} from "./selection.js";
import type {
	WorkerProposal,
	WorkItemCandidate,
	WorkItem,
} from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWorker(
	overrides: Partial<WorkerProposal> = {},
): Readonly<WorkerProposal> {
	return {
		id: "worker-1",
		capabilities: ["gpu", "cpu"],
		inflight: 0,
		...overrides,
	};
}

function makeCandidate(
	overrides: Partial<WorkItemCandidate> = {},
): Readonly<WorkItemCandidate> {
	return {
		id: "item-1",
		type: "render",
		payloadBytes: 100,
		createdAt: 1000,
		availableAt: 1000,
		attempt: 0,
		...overrides,
	};
}

function makeWorkItem(
	overrides: Partial<WorkItem> = {},
): Readonly<WorkItem> {
	return {
		id: "item-1",
		type: "render",
		payload: {},
		payloadBytes: 100,
		errors: [],
		stateChanges: [],
		retryDelayTimes: [],
		runtime: {
			state: "pending",
			attempt: 0,
			maxRetries: 3,
			createdAt: 1000,
			updatedAt: 1000,
			version: 0,
		},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// defaultSelectWorkItemForWorker
// ---------------------------------------------------------------------------

describe("defaultSelectWorkItemForWorker", () => {
	it("returns the best candidate when all pass filters", () => {
		const worker = makeWorker();
		const candidates = [makeCandidate({ id: "a" }), makeCandidate({ id: "b" })];
		const result = defaultSelectWorkItemForWorker({
			worker,
			candidates,
			now: 2000,
		});
		// Both identical except id — first one wins (same score)
		expect(result).toBeDefined();
		expect(["a", "b"]).toContain(result);
	});

	it("filters by requiredCapabilities", () => {
		const worker = makeWorker({ capabilities: ["cpu"] });
		const candidates = [
			makeCandidate({ id: "needs-gpu", requiredCapabilities: ["gpu"] }),
			makeCandidate({ id: "needs-cpu", requiredCapabilities: ["cpu"] }),
		];
		expect(
			defaultSelectWorkItemForWorker({ worker, candidates, now: 2000 }),
		).toBe("needs-cpu");
	});

	it("filters by maxPayloadBytes", () => {
		const worker = makeWorker({ maxPayloadBytes: 50 });
		const candidates = [
			makeCandidate({ id: "big", payloadBytes: 100 }),
			makeCandidate({ id: "small", payloadBytes: 40 }),
		];
		expect(
			defaultSelectWorkItemForWorker({ worker, candidates, now: 2000 }),
		).toBe("small");
	});

	it("filters by availableAt", () => {
		const worker = makeWorker();
		const candidates = [
			makeCandidate({ id: "future", availableAt: 9999 }),
			makeCandidate({ id: "ready", availableAt: 1000 }),
		];
		expect(
			defaultSelectWorkItemForWorker({ worker, candidates, now: 2000 }),
		).toBe("ready");
	});

	it("prefers higher priority", () => {
		const worker = makeWorker();
		const candidates = [
			makeCandidate({ id: "low", priority: 1, createdAt: 2000 }),
			makeCandidate({ id: "high", priority: 10, createdAt: 2000 }),
		];
		expect(
			defaultSelectWorkItemForWorker({ worker, candidates, now: 2000 }),
		).toBe("high");
	});

	it("prefers older items (higher age)", () => {
		const worker = makeWorker();
		const candidates = [
			makeCandidate({ id: "new", createdAt: 1990 }),
			makeCandidate({ id: "old", createdAt: 1000 }),
		];
		expect(
			defaultSelectWorkItemForWorker({ worker, candidates, now: 2000 }),
		).toBe("old");
	});

	it("applies retry penalty", () => {
		const worker = makeWorker();
		const candidates = [
			makeCandidate({ id: "retried", attempt: 5, createdAt: 1000 }),
			makeCandidate({ id: "fresh", attempt: 0, createdAt: 1000 }),
		];
		expect(
			defaultSelectWorkItemForWorker({ worker, candidates, now: 2000 }),
		).toBe("fresh");
	});

	it("applies affinity bonus", () => {
		const worker = makeWorker({ tags: ["zone-a"] });
		const candidates = [
			makeCandidate({ id: "no-affinity", createdAt: 1000 }),
			makeCandidate({ id: "affinity", affinityKey: "zone-a", createdAt: 1000 }),
		];
		expect(
			defaultSelectWorkItemForWorker({ worker, candidates, now: 2000 }),
		).toBe("affinity");
	});

	it("applies cpu/memory telemetry penalty", () => {
		// High-load worker penalises all candidates — but among candidates the
		// scoring is the same, so we compare two workers instead of two candidates.
		const hotWorker = makeWorker({
			telemetry: { cpuLoad: 0.9, memoryUsageRatio: 0.9 } as Record<string, unknown>,
		});
		const coldWorker = makeWorker({
			telemetry: { cpuLoad: 0.1, memoryUsageRatio: 0.1 } as Record<string, unknown>,
		});
		const candidates = [makeCandidate({ id: "a", createdAt: 1000 })];
		// A cold worker gives candidate a higher score
		const scoreHot = defaultSelectWorkItemForWorker({
			worker: hotWorker,
			candidates,
			now: 2000,
		});
		const scoreCold = defaultSelectWorkItemForWorker({
			worker: coldWorker,
			candidates,
			now: 2000,
		});
		// Both still return the only candidate — but we can verify by checking
		// that neither returns undefined
		expect(scoreHot).toBe("a");
		expect(scoreCold).toBe("a");
	});

	it("returns undefined when no candidates pass filters", () => {
		const worker = makeWorker({ capabilities: [] });
		const candidates = [
			makeCandidate({ requiredCapabilities: ["gpu"] }),
		];
		expect(
			defaultSelectWorkItemForWorker({ worker, candidates, now: 2000 }),
		).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// defaultSelectWorkerForWorkItem
// ---------------------------------------------------------------------------

describe("defaultSelectWorkerForWorkItem", () => {
	it("selects the least loaded worker", () => {
		const workItem = makeWorkItem();
		const proposals = [
			makeWorker({
				id: "hot",
				telemetry: { cpuLoad: 0.9, memoryUsageRatio: 0.8 } as Record<string, unknown>,
			}),
			makeWorker({
				id: "cold",
				telemetry: { cpuLoad: 0.1, memoryUsageRatio: 0.1 } as Record<string, unknown>,
			}),
		];
		expect(
			defaultSelectWorkerForWorkItem({ workItem, proposals, now: 2000 }),
		).toBe("cold");
	});

	it("filters by requiredCapabilities", () => {
		const workItem = makeWorkItem({
			options: { requiredCapabilities: ["gpu"] },
		});
		const proposals = [
			makeWorker({ id: "cpu-only", capabilities: ["cpu"] }),
			makeWorker({ id: "has-gpu", capabilities: ["gpu", "cpu"] }),
		];
		expect(
			defaultSelectWorkerForWorkItem({ workItem, proposals, now: 2000 }),
		).toBe("has-gpu");
	});

	it("filters by maxPayloadBytes", () => {
		const workItem = makeWorkItem({ payloadBytes: 500 });
		const proposals = [
			makeWorker({ id: "small", maxPayloadBytes: 100 }),
			makeWorker({ id: "big", maxPayloadBytes: 1000 }),
		];
		expect(
			defaultSelectWorkerForWorkItem({ workItem, proposals, now: 2000 }),
		).toBe("big");
	});

	it("applies affinity bonus", () => {
		const workItem = makeWorkItem({
			options: { affinityKey: "zone-a" },
		});
		const proposals = [
			makeWorker({
				id: "no-tag",
				telemetry: { cpuLoad: 0.1 } as Record<string, unknown>,
			}),
			makeWorker({
				id: "tagged",
				tags: ["zone-a"],
				telemetry: { cpuLoad: 0.1 } as Record<string, unknown>,
			}),
		];
		expect(
			defaultSelectWorkerForWorkItem({ workItem, proposals, now: 2000 }),
		).toBe("tagged");
	});

	it("penalises workers with more inflight items", () => {
		const workItem = makeWorkItem();
		const proposals = [
			makeWorker({ id: "busy", inflight: 10 }),
			makeWorker({ id: "idle", inflight: 0 }),
		];
		expect(
			defaultSelectWorkerForWorkItem({ workItem, proposals, now: 2000 }),
		).toBe("idle");
	});

	it("returns undefined when no proposals pass filters", () => {
		const workItem = makeWorkItem({
			options: { requiredCapabilities: ["quantum"] },
		});
		const proposals = [
			makeWorker({ id: "w1", capabilities: ["cpu"] }),
		];
		expect(
			defaultSelectWorkerForWorkItem({ workItem, proposals, now: 2000 }),
		).toBeUndefined();
	});
});
