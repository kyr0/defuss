import { mkdir, readFile, rm, writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import type {
	DurableStore,
	DurableStoreRecord,
	DurableStoreSnapshot,
	PeerInfo,
	WorkItem,
} from "./types.js";

function deepClone<T>(value: T): T {
	return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

/**
 * Creates an in-memory durable store suitable for testing and ephemeral workloads.
 * State is held in memory only — nothing survives process restarts.
 */
export function createMemoryDurableStore(): DurableStore {
	let snapshot: DurableStoreSnapshot | undefined;
	let records: DurableStoreRecord[] = [];

	return {
		async load(): Promise<DurableStoreSnapshot | undefined> {
			return snapshot ? deepClone(snapshot) : undefined;
		},

		record(record: DurableStoreRecord): void {
			records.push(deepClone(record));
		},

		async flush(snap: DurableStoreSnapshot): Promise<void> {
			snapshot = deepClone(snap);
			records = [];
		},

		async close(snap: DurableStoreSnapshot): Promise<void> {
			snapshot = deepClone(snap);
			records = [];
		},
	};
}

/** Configuration for the JSON file–based durable store. */
export interface JsonFileDurableStoreConfig {
	/** Directory where snapshot and log files are written. */
	dir: string;
	/** Minimum interval between batched log flushes (default: 50 ms). */
	flushThrottleMs?: number;
	/** Name of the snapshot file (default: `"snapshot.json"`). */
	snapshotFileName?: string;
	/** Name of the append-only log file (default: `"events.jsonl"`). */
	logFileName?: string;
}

/**
 * Creates a file-based durable store using an append-only JSONL log for
 * incremental writes and a full JSON snapshot on flush.
 *
 * On {@link DurableStore.load | load()} the snapshot is read first, then any
 * log records appended since the last snapshot are replayed on top.
 *
 * Writes are batched via a throttle timer so the hot path never blocks on I/O.
 */
export function createJsonFileDurableStore(
	config: JsonFileDurableStoreConfig,
): DurableStore {
	const dir = config.dir;
	const flushThrottleMs = config.flushThrottleMs ?? 50;
	const snapshotPath = join(dir, config.snapshotFileName ?? "snapshot.json");
	const logPath = join(dir, config.logFileName ?? "events.jsonl");

	const buffer: DurableStoreRecord[] = [];
	let flushTimer: ReturnType<typeof setTimeout> | undefined;
	let flushPromise: Promise<void> = Promise.resolve();

	function drain(): Promise<void> {
		if (buffer.length === 0) {
			return flushPromise;
		}

		const batch = buffer.splice(0, buffer.length);
		const content =
			batch.map((record) => JSON.stringify(record)).join("\n") + "\n";

		flushPromise = flushPromise.then(async () => {
			await mkdir(dir, { recursive: true });
			await appendFile(logPath, content, "utf8");
		});

		return flushPromise;
	}

	async function flushSnapshot(
		snapshot: DurableStoreSnapshot,
	): Promise<void> {
		if (flushTimer) {
			clearTimeout(flushTimer);
			flushTimer = undefined;
		}
		await drain();
		await mkdir(dir, { recursive: true });
		await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), "utf8");
		await rm(logPath, { force: true });
	}

	return {
		async load(): Promise<DurableStoreSnapshot | undefined> {
			await mkdir(dir, { recursive: true });

			let snapshot: DurableStoreSnapshot | undefined;

			try {
				const raw = await readFile(snapshotPath, "utf8");
				snapshot = JSON.parse(raw) as DurableStoreSnapshot;
			} catch {
				// No snapshot on disk yet — first run.
			}

			if (!snapshot) {
				return undefined;
			}

			try {
				const rawLog = await readFile(logPath, "utf8");
				const lines = rawLog.split("\n").filter(Boolean);
				for (const line of lines) {
					const record = JSON.parse(line) as DurableStoreRecord;
					applyRecord(snapshot, record);
				}
			} catch {
				// No log file or empty — snapshot is already complete.
			}

			return snapshot;
		},

		record(record: DurableStoreRecord): void {
			buffer.push(deepClone(record));
			if (!flushTimer) {
				flushTimer = setTimeout(() => {
					flushTimer = undefined;
					void drain();
				}, flushThrottleMs);
			}
		},

		async flush(snapshot: DurableStoreSnapshot): Promise<void> {
			await flushSnapshot(snapshot);
		},

		async close(snapshot: DurableStoreSnapshot): Promise<void> {
			await flushSnapshot(snapshot);
		},
	};
}

/**
 * Minimal database contract used by {@link createDefussDbDurableStore}.
 * Any key-value store exposing these four operations can serve as a backend.
 */
export interface DefussDbLike {
	get<T>(table: string, key: string): Promise<T | undefined>;
	set<T>(table: string, key: string, value: T): Promise<void>;
	delete(table: string, key: string): Promise<void>;
	entries<T>(table: string): Promise<Array<[string, T]>>;
}

/**
 * Creates a durable store backed by a generic key-value database.
 *
 * Each peer gets its own table namespace (`{selfPeerId}:peers`, `{selfPeerId}:items`).
 *
 * **Note:** {@link DurableStore.record | record()} is fire-and-forget — async errors
 * from the underlying DB are **silently dropped** because the `record()` contract
 * is synchronous. Critical state is captured at {@link DurableStore.flush | flush()} time.
 */
export function createDefussDbDurableStore(
	db: DefussDbLike,
	selfPeerId: string,
): DurableStore {
	async function persistAll(snapshot: DurableStoreSnapshot): Promise<void> {
		await db.set(`${selfPeerId}:meta`, "snapshot", { schemaVersion: 1 });
		for (const peer of snapshot.peers) {
			await db.set(`${selfPeerId}:peers`, peer.id, peer);
		}
		for (const item of snapshot.items) {
			await db.set(`${selfPeerId}:items`, item.id, item);
		}
	}

	return {
		async load(): Promise<DurableStoreSnapshot | undefined> {
			const peersEntries = await db.entries<PeerInfo>(`${selfPeerId}:peers`);
			const itemEntries = await db.entries<WorkItem>(`${selfPeerId}:items`);
			const meta = await db.get<{ schemaVersion: 1 }>(
				`${selfPeerId}:meta`,
				"snapshot",
			);
			if (!meta) return undefined;
			return {
				schemaVersion: 1,
				selfPeerId,
				peers: peersEntries.map((entry) => entry[1]),
				items: itemEntries.map((entry) => entry[1]),
			};
		},
		record(record: DurableStoreRecord): void {
			void (async () => {
				switch (record.kind) {
					case "upsert-peer":
						if (record.peer) {
							await db.set(`${selfPeerId}:peers`, record.peer.id, record.peer);
						}
						break;
					case "delete-peer":
						if (record.peerId) {
							await db.delete(`${selfPeerId}:peers`, record.peerId);
						}
						break;
					case "put-item":
						if (record.item) {
							await db.set(`${selfPeerId}:items`, record.item.id, record.item);
						}
						break;
					case "delete-item":
						if (record.itemId) {
							await db.delete(`${selfPeerId}:items`, record.itemId);
						}
						break;
				}
			})();
		},
		async flush(snapshot: DurableStoreSnapshot): Promise<void> {
			await persistAll(snapshot);
		},
		async close(snapshot: DurableStoreSnapshot): Promise<void> {
			await persistAll(snapshot);
		},
	};
}

/**
 * Applies a single durable-store record to an in-memory snapshot.
 * Used during log replay on startup.
 */
function applyRecord(
	snapshot: DurableStoreSnapshot,
	record: DurableStoreRecord,
): void {
	switch (record.kind) {
		case "upsert-peer": {
			if (!record.peer) return;
			const peer = record.peer;
			const idx = snapshot.peers.findIndex((p) => p.id === peer.id);
			if (idx >= 0) snapshot.peers[idx] = peer;
			else snapshot.peers.push(peer);
			return;
		}
		case "delete-peer": {
			if (!record.peerId) return;
			const peerId = record.peerId;
			snapshot.peers = snapshot.peers.filter((p) => p.id !== peerId);
			return;
		}
		case "put-item": {
			if (!record.item) return;
			const item = record.item;
			const idx = snapshot.items.findIndex((i) => i.id === item.id);
			if (idx >= 0) snapshot.items[idx] = item;
			else snapshot.items.push(item);
			return;
		}
		case "delete-item": {
			if (!record.itemId) return;
			const itemId = record.itemId;
			snapshot.items = snapshot.items.filter((i) => i.id !== itemId);
			return;
		}
	}
}
