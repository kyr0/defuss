import { bench, describe } from "vitest";
import {
	defaultSelectWorkItemForWorker,
	defaultSelectWorkerForWorkItem,
} from "../src/selection.js";
import type { WorkerProposal, WorkItemCandidate, WorkItem } from "../src/types.js";

function makeCandidate(i: number): WorkItemCandidate {
	return {
		id: `item-${i}`,
		type: "render",
		payloadBytes: 100,
		createdAt: 1000 + i,
		availableAt: 1000,
		attempt: i % 3,
		priority: i % 5,
		affinityKey: i % 4 === 0 ? "zone-a" : undefined,
		requiredCapabilities: i % 2 === 0 ? ["cpu"] : ["cpu", "gpu"],
	};
}

function makeProposal(i: number): WorkerProposal {
	return {
		id: `worker-${i}`,
		capabilities: ["cpu", "gpu"],
		inflight: i % 5,
		tags: i % 3 === 0 ? ["zone-a"] : undefined,
		telemetry: {
			cpuLoad: Math.random() * 0.8,
			memoryUsageRatio: Math.random() * 0.7,
			gpuLoad: Math.random() * 0.5,
			vramUsageRatio: Math.random() * 0.4,
		},
	};
}

const worker: WorkerProposal = {
	id: "worker-1",
	capabilities: ["cpu", "gpu"],
	inflight: 2,
	tags: ["zone-a"],
	telemetry: { cpuLoad: 0.3, memoryUsageRatio: 0.4 },
};

describe("defaultSelectWorkItemForWorker", () => {
	const candidates128 = Array.from({ length: 128 }, (_, i) => makeCandidate(i));
	const candidates1024 = Array.from({ length: 1024 }, (_, i) => makeCandidate(i));

	bench("128 candidates", () => {
		defaultSelectWorkItemForWorker({
			worker,
			candidates: candidates128,
			now: 5000,
		});
	});

	bench("1024 candidates", () => {
		defaultSelectWorkItemForWorker({
			worker,
			candidates: candidates1024,
			now: 5000,
		});
	});
});

describe("defaultSelectWorkerForWorkItem", () => {
	const workItem: WorkItem = {
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
		options: {
			requiredCapabilities: ["cpu"],
			affinityKey: "zone-a",
		},
	};

	const proposals16 = Array.from({ length: 16 }, (_, i) => makeProposal(i));
	const proposals64 = Array.from({ length: 64 }, (_, i) => makeProposal(i));

	bench("16 proposals", () => {
		defaultSelectWorkerForWorkItem({
			workItem,
			proposals: proposals16,
			now: 5000,
		});
	});

	bench("64 proposals", () => {
		defaultSelectWorkerForWorkItem({
			workItem,
			proposals: proposals64,
			now: 5000,
		});
	});
});
