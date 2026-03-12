import { describe, it, expect, beforeEach, vi } from "vitest";
import { createOrchestrator } from "./orchestrator.js";
import type { Orchestrator, CompletionReport, FailureReport } from "./orchestrator.js";
import { createMemoryDurableStore } from "./store.js";
import type {
	DurableStore,
	OrchestratorConfig,
	PeerInfo,
	WorkerProposal,
	TelemetrySink,
} from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let clock: number;

function makeSelf(): OrchestratorConfig["self"] {
	return { id: "self", endpoint: "http://self:8080", incarnation: 1 };
}

function makeConfig(
	overrides: Partial<OrchestratorConfig> = {},
): OrchestratorConfig {
	return {
		self: makeSelf(),
		now: () => clock,
		peerTtlMs: 30_000,
		workItemMaxTimeResponsibleMs: 60_000,
		workItemMaxRetries: 3,
		workItemRetryDelayMs: 1_000,
		workItemRetryExponentialBackoff: 2,
		workItemPayloadMaxBytes: 1_000_000,
		terminalRetentionMs: 10_000,
		abandonedRetentionMs: 10_000,
		...overrides,
	};
}

function makeWorker(
	overrides: Partial<WorkerProposal> = {},
): WorkerProposal {
	return {
		id: "worker-1",
		capabilities: ["cpu"],
		inflight: 0,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createOrchestrator", () => {
	beforeEach(() => {
		clock = 10_000;
	});

	it("returns a valid Orchestrator interface", () => {
		const orch = createOrchestrator(makeConfig());
		expect(orch).toBeDefined();
		expect(typeof orch.start).toBe("function");
		expect(typeof orch.close).toBe("function");
		expect(typeof orch.tick).toBe("function");
		expect(typeof orch.schedule).toBe("function");
		expect(typeof orch.leaseNextWork).toBe("function");
		expect(typeof orch.reportStarted).toBe("function");
		expect(typeof orch.reportCompleted).toBe("function");
		expect(typeof orch.reportFailed).toBe("function");
		expect(typeof orch.getStatus).toBe("function");
		expect(typeof orch.getSuggestedOwner).toBe("function");
		expect(typeof orch.snapshot).toBe("function");
	});
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe("lifecycle", () => {
	beforeEach(() => {
		clock = 10_000;
	});

	it("start() loads state from durable store", async () => {
		const store = createMemoryDurableStore();
		const orch1 = createOrchestrator(makeConfig({ durableStore: store }));
		await orch1.start();

		// Schedule an item
		orch1.schedule({
			id: "item-1",
			type: "task",
			payload: "hello",
			payloadBytes: 5,
		});

		await orch1.close();

		// Create a second orchestrator using the same store
		const orch2 = createOrchestrator(makeConfig({ durableStore: store }));
		await orch2.start();

		const status = orch2.getStatus("item-1");
		expect(status.kind).toBe("local");
	});

	it("close() persists state", async () => {
		const store = createMemoryDurableStore();
		const orch = createOrchestrator(makeConfig({ durableStore: store }));
		await orch.start();
		orch.schedule({
			id: "item-x",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});
		await orch.close();

		const loaded = await store.load();
		expect(loaded).toBeDefined();
		expect(loaded!.items.some((i) => i.id === "item-x")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Peer management
// ---------------------------------------------------------------------------

describe("peer management", () => {
	beforeEach(() => {
		clock = 10_000;
	});

	it("self peer is always present", () => {
		const orch = createOrchestrator(makeConfig());
		const peers = orch.listKnownPeers();
		expect(peers.some((p) => p.id === "self")).toBe(true);
	});

	it("upsertPeer adds a new peer", () => {
		const orch = createOrchestrator(makeConfig());
		orch.upsertPeer({
			id: "peer-b",
			endpoint: "http://peer-b:8080",
			incarnation: 1,
		});
		expect(orch.listKnownPeers().some((p) => p.id === "peer-b")).toBe(true);
	});

	it("upsertPeer updates an existing peer", () => {
		const orch = createOrchestrator(makeConfig());
		orch.upsertPeer({
			id: "peer-b",
			endpoint: "http://peer-b:8080",
			incarnation: 1,
		});
		orch.upsertPeer({
			id: "peer-b",
			endpoint: "http://peer-b:9090",
			incarnation: 2,
		});
		const peer = orch.listKnownPeers().find((p) => p.id === "peer-b");
		expect(peer?.endpoint).toBe("http://peer-b:9090");
		expect(peer?.incarnation).toBe(2);
	});

	it("removePeer removes a non-self peer", () => {
		const orch = createOrchestrator(makeConfig());
		orch.upsertPeer({
			id: "peer-b",
			endpoint: "http://peer-b:8080",
			incarnation: 1,
		});
		orch.removePeer("peer-b");
		expect(orch.listKnownPeers().some((p) => p.id === "peer-b")).toBe(false);
	});

	it("removePeer refuses to remove self", () => {
		const orch = createOrchestrator(makeConfig());
		orch.removePeer("self");
		expect(orch.listKnownPeers().some((p) => p.id === "self")).toBe(true);
	});

	it("listLivePeerIds excludes expired peers", () => {
		const orch = createOrchestrator(makeConfig({ peerTtlMs: 5_000 }));
		orch.upsertPeer({
			id: "peer-b",
			endpoint: "http://peer-b:8080",
			incarnation: 1,
			lastSeenAt: 1_000, // way in the past
		});
		const live = orch.listLivePeerIds();
		expect(live).toContain("self");
		expect(live).not.toContain("peer-b");
	});

	it("listLivePeerIds includes fresh peers", () => {
		const orch = createOrchestrator(makeConfig({ peerTtlMs: 5_000 }));
		orch.upsertPeer({
			id: "peer-b",
			endpoint: "http://peer-b:8080",
			incarnation: 1,
			lastSeenAt: clock,
		});
		expect(orch.listLivePeerIds()).toContain("peer-b");
	});
});

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

describe("schedule", () => {
	beforeEach(() => {
		clock = 10_000;
	});

	it("accepts a local work item", () => {
		const orch = createOrchestrator(makeConfig());
		const result = orch.schedule({
			id: "item-1",
			type: "task",
			payload: { msg: "hi" },
			payloadBytes: 64,
		});
		expect(result.kind).toBe("accepted");
		if (result.kind === "accepted") {
			expect(result.item.runtime.state).toBe("pending");
		}
	});

	it("redirects work not owned by self", () => {
		const orch = createOrchestrator(makeConfig());
		// Add another peer so rendezvous may pick it
		orch.upsertPeer({
			id: "peer-b",
			endpoint: "http://peer-b:8080",
			incarnation: 1,
			lastSeenAt: clock,
		});

		// Try many items — at least some should redirect
		let redirectCount = 0;
		for (let i = 0; i < 100; i++) {
			const result = orch.schedule({
				id: `item-${i}`,
				type: "task",
				payload: null,
				payloadBytes: 0,
			});
			if (result.kind === "redirect") redirectCount++;
		}
		expect(redirectCount).toBeGreaterThan(0);
	});

	it("throws for oversized payload", () => {
		const orch = createOrchestrator(
			makeConfig({ workItemPayloadMaxBytes: 100 }),
		);
		expect(() =>
			orch.schedule({
				id: "big",
				type: "task",
				payload: null,
				payloadBytes: 200,
			}),
		).toThrow(/payloadBytes/);
	});

	it("is idempotent for existing items", () => {
		const orch = createOrchestrator(makeConfig());
		const r1 = orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});
		const r2 = orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});
		expect(r1.kind).toBe("accepted");
		expect(r2.kind).toBe("accepted");
	});
});

// ---------------------------------------------------------------------------
// Lease
// ---------------------------------------------------------------------------

describe("leaseNextWork", () => {
	beforeEach(() => {
		clock = 10_000;
	});

	it("returns pending items", () => {
		const orch = createOrchestrator(makeConfig());
		orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});
		const result = orch.leaseNextWork({ worker: makeWorker() });
		expect(result.kind).toBe("leased");
		if (result.kind === "leased") {
			expect(result.workItem.id).toBe("item-1");
			expect(result.workItem.runtime.state).toBe("leased");
		}
	});

	it("returns empty when no work", () => {
		const orch = createOrchestrator(makeConfig());
		const result = orch.leaseNextWork({ worker: makeWorker() });
		expect(result.kind).toBe("empty");
	});

	it("filters by worker capabilities", () => {
		const orch = createOrchestrator(makeConfig());
		orch.schedule({
			id: "item-gpu",
			type: "task",
			payload: null,
			payloadBytes: 0,
			options: { requiredCapabilities: ["gpu"] },
		});
		const result = orch.leaseNextWork({
			worker: makeWorker({ capabilities: ["cpu"] }),
		});
		expect(result.kind).toBe("empty");
	});

	it("leases to a worker with matching capabilities", () => {
		const orch = createOrchestrator(makeConfig());
		orch.schedule({
			id: "item-gpu",
			type: "task",
			payload: null,
			payloadBytes: 0,
			options: { requiredCapabilities: ["gpu"] },
		});
		const result = orch.leaseNextWork({
			worker: makeWorker({ capabilities: ["gpu", "cpu"] }),
		});
		expect(result.kind).toBe("leased");
	});
});

// ---------------------------------------------------------------------------
// State machine transitions
// ---------------------------------------------------------------------------

describe("state machine", () => {
	let orch: Orchestrator;

	beforeEach(() => {
		clock = 10_000;
		orch = createOrchestrator(makeConfig());
	});

	it("pending → leased → running → completed", () => {
		orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});

		const leaseResult = orch.leaseNextWork({ worker: makeWorker() });
		expect(leaseResult.kind).toBe("leased");

		const startResult = orch.reportStarted({
			id: "item-1",
			workerId: "worker-1",
		});
		expect(startResult.kind).toBe("local");
		if (startResult.kind === "local") {
			expect(startResult.item.runtime.state).toBe("running");
		}

		const completeResult = orch.reportCompleted({
			id: "item-1",
			workerId: "worker-1",
			result: { success: true, result: 42 },
		});
		expect(completeResult.kind).toBe("local");
		if (completeResult.kind === "local") {
			expect(completeResult.item.runtime.state).toBe("completed");
		}
	});

	it("pending → leased → running → error (terminal)", () => {
		orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
			options: { retry: false },
		});

		orch.leaseNextWork({ worker: makeWorker() });
		orch.reportStarted({ id: "item-1", workerId: "worker-1" });

		const result = orch.reportFailed({
			id: "item-1",
			workerId: "worker-1",
			error: { name: "Err", message: "fail", at: clock, attempt: 0 },
		});

		expect(result.kind).toBe("local");
		if (result.kind === "local") {
			expect(result.item.runtime.state).toBe("error");
		}
	});
});

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

describe("retry", () => {
	let orch: Orchestrator;

	beforeEach(() => {
		clock = 10_000;
		orch = createOrchestrator(
			makeConfig({
				workItemRetryDelayMs: 1_000,
				workItemRetryExponentialBackoff: 2,
				workItemMaxRetries: 3,
			}),
		);
	});

	it("moves to retry-wait on failure with retries remaining", () => {
		orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});
		orch.leaseNextWork({ worker: makeWorker() });
		orch.reportStarted({ id: "item-1", workerId: "worker-1" });

		const result = orch.reportFailed({
			id: "item-1",
			workerId: "worker-1",
			error: { name: "Err", message: "oops", at: clock, attempt: 0 },
		});

		expect(result.kind).toBe("local");
		if (result.kind === "local") {
			expect(result.item.runtime.state).toBe("retry-wait");
		}
	});

	it("transitions retry-wait → pending after delay elapses", () => {
		orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});
		orch.leaseNextWork({ worker: makeWorker() });
		orch.reportStarted({ id: "item-1", workerId: "worker-1" });
		orch.reportFailed({
			id: "item-1",
			workerId: "worker-1",
			error: { name: "Err", message: "oops", at: clock, attempt: 0 },
		});

		// Advance time past the retry delay
		clock += 5_000;
		orch.tick();

		const status = orch.getStatus("item-1");
		expect(status.kind).toBe("local");
		if (status.kind === "local") {
			expect(status.item.runtime.state).toBe("pending");
		}
	});

	it("applies exponential backoff on successive retries", () => {
		orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});

		// Fail twice and check that the second delay is longer
		orch.leaseNextWork({ worker: makeWorker() });
		orch.reportStarted({ id: "item-1", workerId: "worker-1" });
		orch.reportFailed({
			id: "item-1",
			workerId: "worker-1",
			error: { name: "Err", message: "fail 1", at: clock, attempt: 0 },
		});
		const s1 = orch.getStatus("item-1");
		const delay1 =
			s1.kind === "local" ? s1.item.retryDelayTimes[0] : undefined;

		// Advance past first retry
		clock += 10_000;
		orch.tick();

		orch.leaseNextWork({ worker: makeWorker() });
		orch.reportStarted({ id: "item-1", workerId: "worker-1" });
		orch.reportFailed({
			id: "item-1",
			workerId: "worker-1",
			error: { name: "Err", message: "fail 2", at: clock, attempt: 1 },
		});
		const s2 = orch.getStatus("item-1");
		const delay2 =
			s2.kind === "local" ? s2.item.retryDelayTimes[1] : undefined;

		expect(delay1).toBeDefined();
		expect(delay2).toBeDefined();
		expect(delay2!).toBeGreaterThan(delay1!);
	});
});

// ---------------------------------------------------------------------------
// Abandonment (lease expiry)
// ---------------------------------------------------------------------------

describe("abandonment", () => {
	beforeEach(() => {
		clock = 10_000;
	});

	it("abandons leased items after lease expiry", () => {
		const orch = createOrchestrator(
			makeConfig({ workItemMaxTimeResponsibleMs: 5_000 }),
		);
		orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});
		orch.leaseNextWork({ worker: makeWorker() });

		// Advance past the lease timeout
		clock += 10_000;
		orch.tick();

		const status = orch.getStatus("item-1");
		expect(status.kind).toBe("local");
		if (status.kind === "local") {
			expect(status.item.runtime.state).toBe("abandoned");
		}
	});

	it("removes abandoned items after retention TTL", () => {
		const orch = createOrchestrator(
			makeConfig({
				workItemMaxTimeResponsibleMs: 5_000,
				abandonedRetentionMs: 2_000,
			}),
		);
		orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});
		orch.leaseNextWork({ worker: makeWorker() });

		// Expire lease
		clock += 6_000;
		orch.tick();

		// Advance past abandoned retention
		clock += 3_000;
		orch.tick();

		const status = orch.getStatus("item-1");
		expect(status.kind).not.toBe("local");
	});
});

// ---------------------------------------------------------------------------
// Terminal cleanup
// ---------------------------------------------------------------------------

describe("terminal cleanup", () => {
	beforeEach(() => {
		clock = 10_000;
	});

	it("removes completed items after terminalRetentionMs", () => {
		const orch = createOrchestrator(
			makeConfig({ terminalRetentionMs: 3_000 }),
		);
		orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});
		orch.leaseNextWork({ worker: makeWorker() });
		orch.reportStarted({ id: "item-1", workerId: "worker-1" });
		orch.reportCompleted({
			id: "item-1",
			workerId: "worker-1",
			result: { success: true },
		});

		// Advance past retention
		clock += 5_000;
		orch.tick();

		const status = orch.getStatus("item-1");
		expect(status.kind).not.toBe("local");
	});
});

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

describe("getStatus", () => {
	beforeEach(() => {
		clock = 10_000;
	});

	it("returns local for owned items", () => {
		const orch = createOrchestrator(makeConfig());
		orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});
		const status = orch.getStatus("item-1");
		expect(status.kind).toBe("local");
	});

	it("returns unknown for totally unknown items when alone", () => {
		const orch = createOrchestrator(makeConfig());
		const status = orch.getStatus("nonexistent");
		expect(status.kind).toBe("unknown");
	});

	it("returns redirect-suggested for unknown items with other peers", () => {
		const orch = createOrchestrator(makeConfig());
		orch.upsertPeer({
			id: "peer-b",
			endpoint: "http://peer-b:8080",
			incarnation: 1,
			lastSeenAt: clock,
		});
		// Some item IDs will hash to peer-b
		let foundRedirect = false;
		for (let i = 0; i < 100; i++) {
			const status = orch.getStatus(`probe-${i}`);
			if (status.kind === "redirect-suggested") {
				foundRedirect = true;
				break;
			}
		}
		expect(foundRedirect).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Recovery (persist → close → reload)
// ---------------------------------------------------------------------------

describe("recovery", () => {
	beforeEach(() => {
		clock = 10_000;
	});

	it("preserves items across close → start cycle", async () => {
		const store = createMemoryDurableStore();
		const orch1 = createOrchestrator(makeConfig({ durableStore: store }));
		await orch1.start();

		orch1.schedule({
			id: "item-1",
			type: "task",
			payload: { data: 42 },
			payloadBytes: 10,
		});
		orch1.schedule({
			id: "item-2",
			type: "task",
			payload: { data: 99 },
			payloadBytes: 10,
		});
		await orch1.close();

		const orch2 = createOrchestrator(makeConfig({ durableStore: store }));
		await orch2.start();

		expect(orch2.getStatus("item-1").kind).toBe("local");
		expect(orch2.getStatus("item-2").kind).toBe("local");
	});

	it("preserves peers across close → start cycle", async () => {
		const store = createMemoryDurableStore();
		const orch1 = createOrchestrator(makeConfig({ durableStore: store }));
		await orch1.start();

		orch1.upsertPeer({
			id: "peer-b",
			endpoint: "http://peer-b:8080",
			incarnation: 1,
			lastSeenAt: clock,
		});
		await orch1.close();

		const orch2 = createOrchestrator(makeConfig({ durableStore: store }));
		await orch2.start();

		expect(orch2.listKnownPeers().some((p) => p.id === "peer-b")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

describe("telemetry", () => {
	beforeEach(() => {
		clock = 10_000;
	});

	it("calls telemetry sink on schedule", () => {
		const sink: TelemetrySink = {
			incrementCounter: vi.fn(),
			recordHistogram: vi.fn(),
			setGauge: vi.fn(),
		};
		const orch = createOrchestrator(makeConfig({ telemetry: sink }));
		orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});

		expect(sink.incrementCounter).toHaveBeenCalledWith(
			"work_items_scheduled_total",
			1,
			expect.objectContaining({ type: "task" }),
		);
		expect(sink.setGauge).toHaveBeenCalled();
	});

	it("records lease latency histogram", () => {
		const sink: TelemetrySink = {
			incrementCounter: vi.fn(),
			recordHistogram: vi.fn(),
			setGauge: vi.fn(),
		};
		const orch = createOrchestrator(makeConfig({ telemetry: sink }));
		orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});
		clock += 500;
		orch.leaseNextWork({ worker: makeWorker() });

		expect(sink.recordHistogram).toHaveBeenCalledWith(
			"lease_latency_ms",
			expect.any(Number),
			expect.objectContaining({ type: "task" }),
		);
	});
});

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

describe("snapshot", () => {
	beforeEach(() => {
		clock = 10_000;
	});

	it("returns a deep copy of all peers and items", () => {
		const orch = createOrchestrator(makeConfig());
		orch.schedule({
			id: "item-1",
			type: "task",
			payload: null,
			payloadBytes: 0,
		});
		const snap1 = orch.snapshot();
		const snap2 = orch.snapshot();
		expect(snap1).toEqual(snap2);
		expect(snap1).not.toBe(snap2);
		expect(snap1.items[0]).not.toBe(snap2.items[0]);
	});
});

// ---------------------------------------------------------------------------
// getSuggestedOwner
// ---------------------------------------------------------------------------

describe("getSuggestedOwner", () => {
	beforeEach(() => {
		clock = 10_000;
	});

	it("returns a peer for a known item id", () => {
		const orch = createOrchestrator(makeConfig());
		const owner = orch.getSuggestedOwner("some-item");
		expect(owner).toBeDefined();
		expect(owner!.id).toBe("self");
	});

	it("may return a different peer when multiple peers exist", () => {
		const orch = createOrchestrator(makeConfig());
		orch.upsertPeer({
			id: "peer-b",
			endpoint: "http://peer-b:8080",
			incarnation: 1,
			lastSeenAt: clock,
		});

		let foundOther = false;
		for (let i = 0; i < 100; i++) {
			const owner = orch.getSuggestedOwner(`item-${i}`);
			if (owner && owner.id === "peer-b") {
				foundOther = true;
				break;
			}
		}
		expect(foundOther).toBe(true);
	});
});
