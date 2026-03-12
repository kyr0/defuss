import { bench, describe } from "vitest";
import { createMemoryDurableStore } from "../src/store.js";
import type { DurableStoreSnapshot, DurableStoreRecord, WorkItem } from "../src/types.js";

function makeItem(i: number): WorkItem {
	return {
		id: `item-${i}`,
		type: "task",
		payload: { data: i },
		payloadBytes: 64,
		errors: [],
		stateChanges: [],
		retryDelayTimes: [],
		runtime: {
			state: "pending",
			attempt: 0,
			maxRetries: 3,
			createdAt: 1000 + i,
			updatedAt: 1000 + i,
			version: 0,
		},
	};
}

function makeSnapshot(count: number): DurableStoreSnapshot {
	return {
		schemaVersion: 1,
		selfPeerId: "self",
		peers: [],
		items: Array.from({ length: count }, (_, i) => makeItem(i)),
	};
}

describe("MemoryDurableStore", () => {
	bench("record + flush (100 records)", async () => {
		const store = createMemoryDurableStore();
		for (let i = 0; i < 100; i++) {
			store.record({
				kind: "put-item",
				at: 1000 + i,
				item: makeItem(i),
			});
		}
		await store.flush(makeSnapshot(100));
	});

	bench("record + flush (1000 records)", async () => {
		const store = createMemoryDurableStore();
		for (let i = 0; i < 1000; i++) {
			store.record({
				kind: "put-item",
				at: 1000 + i,
				item: makeItem(i),
			});
		}
		await store.flush(makeSnapshot(1000));
	});

	bench("load after flush (100 items)", async () => {
		const store = createMemoryDurableStore();
		await store.flush(makeSnapshot(100));
		await store.load();
	});

	bench("load after flush (1000 items)", async () => {
		const store = createMemoryDurableStore();
		await store.flush(makeSnapshot(1000));
		await store.load();
	});
});
