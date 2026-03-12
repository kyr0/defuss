import { bench, describe } from "vitest";
import { createOrchestrator } from "../src/orchestrator.js";
import type { OrchestratorConfig, WorkerProposal } from "../src/types.js";

function makeConfig(overrides: Partial<OrchestratorConfig> = {}): OrchestratorConfig {
	return {
		self: { id: "self", endpoint: "http://self:8080", incarnation: 1 },
		now: () => 10_000,
		workItemMaxTimeResponsibleMs: 600_000,
		terminalRetentionMs: 600_000,
		...overrides,
	};
}

const worker: WorkerProposal = {
	id: "worker-1",
	capabilities: ["cpu"],
	inflight: 0,
};

describe("schedule", () => {
	bench("schedule() throughput", () => {
		const orch = createOrchestrator(makeConfig());
		for (let i = 0; i < 100; i++) {
			orch.schedule({
				id: `item-${i}`,
				type: "task",
				payload: null,
				payloadBytes: 0,
			});
		}
	});
});

describe("full cycle", () => {
	bench("schedule → lease → start → complete (100 items)", () => {
		const orch = createOrchestrator(makeConfig());
		for (let i = 0; i < 100; i++) {
			orch.schedule({
				id: `item-${i}`,
				type: "task",
				payload: null,
				payloadBytes: 0,
			});
		}
		for (let i = 0; i < 100; i++) {
			const r = orch.leaseNextWork({ worker });
			if (r.kind === "leased") {
				orch.reportStarted({ id: r.workItem.id, workerId: worker.id });
				orch.reportCompleted({
					id: r.workItem.id,
					workerId: worker.id,
					result: { success: true },
				});
			}
		}
	});
});

describe("leaseNextWork with loaded queues", () => {
	function makeOrchestratorWithItems(count: number) {
		const orch = createOrchestrator(makeConfig());
		for (let i = 0; i < count; i++) {
			orch.schedule({
				id: `item-${i}`,
				type: "task",
				payload: null,
				payloadBytes: 0,
			});
		}
		return orch;
	}

	bench("100 pending items", () => {
		const orch = makeOrchestratorWithItems(100);
		orch.leaseNextWork({ worker });
	});

	bench("1000 pending items", () => {
		const orch = makeOrchestratorWithItems(1000);
		orch.leaseNextWork({ worker });
	});

	bench("10000 pending items", () => {
		const orch = makeOrchestratorWithItems(10_000);
		orch.leaseNextWork({ worker });
	});
});

describe("tick", () => {
	bench("tick() with 1000 items across all heaps", () => {
		let clock = 10_000;
		const orch = createOrchestrator(
			makeConfig({
				now: () => clock,
				workItemMaxTimeResponsibleMs: 5_000,
				workItemRetryDelayMs: 1_000,
			}),
		);

		for (let i = 0; i < 1000; i++) {
			orch.schedule({
				id: `item-${i}`,
				type: "task",
				payload: null,
				payloadBytes: 0,
			});
		}

		// Lease all
		for (let i = 0; i < 1000; i++) {
			orch.leaseNextWork({ worker });
		}

		// Advance past lease expiry
		clock += 10_000;
		orch.tick();
	});
});
