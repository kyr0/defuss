import { pickResponsiblePeer } from "defuss-hash";
import { noopTelemetrySink, METRIC_NAMES } from "./metrics.js";
import { defaultSelectWorkItemForWorker } from "./selection.js";
import { createMemoryDurableStore } from "./store.js";
import type {
	LeaseRequest,
	LeaseResult,
	OrchestratorConfig,
	PeerInfo,
	ScheduleInput,
	ScheduleResult,
	StatusResult,
	TelemetrySink,
	WorkItem,
	WorkItemCandidate,
	WorkItemError,
	WorkItemResult,
	WorkItemRuntime,
	WorkerProposal,
} from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clone<T>(value: T): T {
	return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// MinHeap (closure-based, internal)
// ---------------------------------------------------------------------------

interface TimerEntry {
	id: string;
	dueAt: number;
	version: number;
}

interface MinHeap<T> {
	push(value: T): void;
	peek(): T | undefined;
	pop(): T | undefined;
	readonly size: number;
}

function createMinHeap<T>(compare: (a: T, b: T) => number): MinHeap<T> {
	const values: T[] = [];

	function bubbleUp(index: number): void {
		while (index > 0) {
			const parent = Math.floor((index - 1) / 2);
			const child = values[index];
			const par = values[parent];
			if (child === undefined || par === undefined || compare(child, par) >= 0)
				break;
			values[index] = par;
			values[parent] = child;
			index = parent;
		}
	}

	function bubbleDown(index: number): void {
		const length = values.length;
		while (true) {
			const left = index * 2 + 1;
			const right = left + 1;
			let smallest = index;

			const cur = values[smallest];
			const lv = left < length ? values[left] : undefined;
			const rv = right < length ? values[right] : undefined;

			if (lv !== undefined && cur !== undefined && compare(lv, cur) < 0) {
				smallest = left;
			}
			const sm = values[smallest];
			if (rv !== undefined && sm !== undefined && compare(rv, sm) < 0) {
				smallest = right;
			}
			if (smallest === index) return;

			const tmp = values[index];
			const swp = values[smallest];
			if (tmp !== undefined && swp !== undefined) {
				values[index] = swp;
				values[smallest] = tmp;
			}
			index = smallest;
		}
	}

	return {
		push(value: T): void {
			values.push(value);
			bubbleUp(values.length - 1);
		},

		peek(): T | undefined {
			return values[0];
		},

		pop(): T | undefined {
			const root = values[0];
			const last = values.pop();
			if (values.length > 0 && last !== undefined) {
				values[0] = last;
				bubbleDown(0);
			}
			return root;
		},

		get size(): number {
			return values.length;
		},
	};
}

function compareTimerEntry(a: TimerEntry, b: TimerEntry): number {
	return a.dueAt - b.dueAt;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Report submitted by a worker when it finishes processing a work item. */
export interface CompletionReport<R = unknown> {
	id: string;
	workerId: string;
	result: WorkItemResult<R>;
}

/** Report submitted by a worker when processing a work item fails. */
export interface FailureReport {
	id: string;
	workerId: string;
	error: WorkItemError;
}

/**
 * Public API surface of the orchestrator.
 *
 * Obtained via {@link createOrchestrator}. All mutating methods are synchronous
 * on the hot path; only {@link start}, {@link close} are async (durability I/O).
 */
export interface Orchestrator<TTelemetry = Record<string, unknown>> {
	/** Load persisted state from the durable store. Call once before use. */
	start(): Promise<void>;
	/** Persist final state and release resources. */
	close(): Promise<void>;
	/** Advance timers: process expired retries, leases, and cleanups. */
	tick(now?: number): void;

	/** Register or refresh a peer in the membership table. */
	upsertPeer(
		peer: Omit<PeerInfo, "lastSeenAt"> & { lastSeenAt?: number },
	): void;
	/** Remove a peer from the membership table (cannot remove self). */
	removePeer(peerId: string): void;
	/** Return a snapshot of all known peers. */
	listKnownPeers(): PeerInfo[];
	/** Return IDs of peers considered live (within TTL). */
	listLivePeerIds(): string[];

	/** Schedule a work item. Returns `accepted` if local, `redirect` otherwise. */
	schedule<P = unknown>(input: ScheduleInput<P>): ScheduleResult;
	/** Pull the next eligible work item for a worker. */
	leaseNextWork(request: LeaseRequest<TTelemetry>): LeaseResult;

	/** Mark a leased item as running. */
	reportStarted(input: { id: string; workerId: string }): StatusResult;
	/** Report successful or unsuccessful completion of a work item. */
	reportCompleted<R = unknown>(input: CompletionReport<R>): StatusResult;
	/** Report a failure and trigger retry or terminal error. */
	reportFailed(input: FailureReport): StatusResult;

	/** Query the status of a work item by ID. */
	getStatus(id: string): StatusResult;
	/** Compute the suggested owner for a work item via rendezvous hashing. */
	getSuggestedOwner(id: string): PeerInfo | undefined;
	/** Return a deep-copy snapshot of all peers and items. */
	snapshot(): { peers: PeerInfo[]; items: WorkItem[] };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a new orchestrator instance.
 *
 * The returned object is a closure — no classes are instantiated.  All mutable
 * state lives in closure variables, and all methods close over it.
 *
 * @param rawConfig - Orchestrator configuration (see {@link OrchestratorConfig}).
 * @returns A fully initialised {@link Orchestrator}.
 */
export function createOrchestrator<TTelemetry = Record<string, unknown>>(
	rawConfig: OrchestratorConfig<TTelemetry>,
): Orchestrator<TTelemetry> {
	// ── resolved config ──────────────────────────────────────────────────
	const peerTtlMs = rawConfig.peerTtlMs ?? 30_000;
	const workItemMaxTimeResponsibleMs =
		rawConfig.workItemMaxTimeResponsibleMs ?? 300_000;
	const workItemMaxRetries = rawConfig.workItemMaxRetries ?? 3;
	const workItemRetryDelayMs = rawConfig.workItemRetryDelayMs ?? 2_000;
	const workItemRetryExponentialBackoff =
		rawConfig.workItemRetryExponentialBackoff ?? 1.5;
	const workItemPayloadMaxBytes =
		rawConfig.workItemPayloadMaxBytes ?? 1_000_000;
	const candidateScanLimit = rawConfig.candidateScanLimit ?? 128;
	const terminalRetentionMs = rawConfig.terminalRetentionMs ?? 60_000;
	const abandonedRetentionMs = rawConfig.abandonedRetentionMs ?? 300_000;
	const now = rawConfig.now ?? (() => Date.now());

	const durableStore = rawConfig.durableStore ?? createMemoryDurableStore();
	const telemetry: TelemetrySink = rawConfig.telemetry ?? noopTelemetrySink;
	const selectWorkItemForWorker =
		rawConfig.selectWorkItemForWorker ?? defaultSelectWorkItemForWorker;

	// ── self peer ────────────────────────────────────────────────────────
	const selfPeer: PeerInfo = {
		id: rawConfig.self.id,
		endpoint: rawConfig.self.endpoint,
		incarnation: rawConfig.self.incarnation,
		lastSeenAt: rawConfig.self.lastSeenAt ?? now(),
		metadata: rawConfig.self.metadata,
	};

	// ── mutable state ────────────────────────────────────────────────────
	const peers = new Map<string, PeerInfo>();
	peers.set(selfPeer.id, clone(selfPeer));

	const items = new Map<string, WorkItem>();
	let pendingQueue: string[] = [];
	let pendingHead = 0;
	const retryHeap = createMinHeap<TimerEntry>(compareTimerEntry);
	const leaseHeap = createMinHeap<TimerEntry>(compareTimerEntry);
	const cleanupHeap = createMinHeap<TimerEntry>(compareTimerEntry);
	const liveWorkers = new Map<string, WorkerProposal<TTelemetry>>();

	// ── internal helpers ─────────────────────────────────────────────────

	/** Compact the pending queue when the dead head grows too large. */
	function compactPendingQueue(): void {
		if (pendingHead > 0 && pendingHead > pendingQueue.length / 2) {
			pendingQueue = pendingQueue.slice(pendingHead);
			pendingHead = 0;
		}
	}

	function listLivePeerIds(ts: number): string[] {
		const live: string[] = [];
		for (const peer of peers.values()) {
			if (
				peer.id === selfPeer.id ||
				ts - peer.lastSeenAt <= peerTtlMs
			) {
				live.push(peer.id);
			}
		}
		live.sort();
		return live;
	}

	function transitionItem(
		item: WorkItem,
		nextState: WorkItemRuntime["state"],
		by: "system" | "worker" | "client" | "peer",
		ts: number,
		note?: string,
	): void {
		const lastChange =
			item.stateChanges.length > 0
				? item.stateChanges[item.stateChanges.length - 1]
				: undefined;
		const from = lastChange ? lastChange.to : null;
		item.runtime.state = nextState;
		item.runtime.updatedAt = ts;
		item.runtime.version += 1;
		item.stateChanges.push({ at: ts, from, to: nextState, by, note });
	}

	function computeRetryDelay(item: WorkItem, nextAttempt: number): number {
		const baseDelay = item.options?.retryDelayMs ?? workItemRetryDelayMs;
		const factor =
			item.options?.retryExponentialBackoff ?? workItemRetryExponentialBackoff;
		return Math.max(
			0,
			Math.round(baseDelay * Math.pow(factor, Math.max(0, nextAttempt - 1))),
		);
	}

	function scheduleCleanup(
		item: WorkItem,
		ts: number,
		retentionMs: number,
	): void {
		if (retentionMs <= 0) {
			items.delete(item.id);
			durableStore.record({ kind: "delete-item", at: ts, itemId: item.id });
			return;
		}
		cleanupHeap.push({
			id: item.id,
			dueAt: ts + retentionMs,
			version: item.runtime.version,
		});
	}

	function reindexItem(item: WorkItem, ts: number): void {
		switch (item.runtime.state) {
			case "pending":
				pendingQueue.push(item.id);
				break;
			case "retry-wait":
				if (item.runtime.nextAttemptAt !== undefined) {
					retryHeap.push({
						id: item.id,
						dueAt: item.runtime.nextAttemptAt,
						version: item.runtime.version,
					});
				}
				break;
			case "leased":
			case "running":
				if (item.runtime.leaseExpiresAt !== undefined) {
					leaseHeap.push({
						id: item.id,
						dueAt: item.runtime.leaseExpiresAt,
						version: item.runtime.version,
					});
				}
				break;
			case "completed":
			case "error":
				scheduleCleanup(item, ts, terminalRetentionMs);
				break;
			case "abandoned":
				scheduleCleanup(item, ts, abandonedRetentionMs);
				break;
			case "transferring":
				break;
		}
	}

	function persistItem(item: WorkItem, ts: number): void {
		durableStore.record({ kind: "put-item", at: ts, item: clone(item) });
	}

	function makeSnapshot() {
		return {
			schemaVersion: 1 as const,
			selfPeerId: selfPeer.id,
			peers: Array.from(peers.values()).map(clone),
			items: Array.from(items.values()).map(clone),
		};
	}

	function publishGauges(): void {
		let pending = 0;
		let running = 0;
		let retryWait = 0;
		for (const item of items.values()) {
			if (item.runtime.state === "pending") pending++;
			if (item.runtime.state === "leased" || item.runtime.state === "running")
				running++;
			if (item.runtime.state === "retry-wait") retryWait++;
		}
		telemetry.setGauge(METRIC_NAMES.pendingGauge, pending);
		telemetry.setGauge(METRIC_NAMES.runningGauge, running);
		telemetry.setGauge(METRIC_NAMES.retryWaitGauge, retryWait);
		telemetry.setGauge(METRIC_NAMES.livePeersGauge, listLivePeerIds(now()).length);
		telemetry.setGauge(METRIC_NAMES.liveWorkersGauge, liveWorkers.size);
	}

	// ── public getStatus (used by several report* methods) ───────────────

	function getStatus(id: string): StatusResult {
		const ts = now();
		const item = items.get(id);
		if (item) {
			const ownerPeerId = item.runtime.ownerPeerId;
			if (!ownerPeerId || ownerPeerId === selfPeer.id) {
				return { kind: "local", item: clone(item) };
			}
			const owner = peers.get(ownerPeerId);
			return {
				kind: "redirect-known",
				ownerPeerId,
				ownerEndpoint: owner?.endpoint,
			};
		}

		const suggestedOwnerId = pickResponsiblePeer(id, listLivePeerIds(ts));
		if (!suggestedOwnerId) return { kind: "unknown" };
		if (suggestedOwnerId === selfPeer.id) return { kind: "unknown" };

		const owner = peers.get(suggestedOwnerId);
		return {
			kind: "redirect-suggested",
			ownerPeerId: suggestedOwnerId,
			ownerEndpoint: owner?.endpoint,
		};
	}

	// ── public tick ──────────────────────────────────────────────────────

	function tick(ts = now()): void {
		// Process expired retry-wait items → pending
		let entry = retryHeap.peek();
		while (entry && entry.dueAt <= ts) {
			retryHeap.pop();
			const item = items.get(entry.id);
			if (item && item.runtime.version === entry.version && item.runtime.state === "retry-wait") {
				transitionItem(item, "pending", "system", ts, "retry-delay-elapsed");
				item.runtime.nextAttemptAt = undefined;
				pendingQueue.push(item.id);
				persistItem(item, ts);
			}
			entry = retryHeap.peek();
		}

		// Process expired leases → abandoned
		entry = leaseHeap.peek();
		while (entry && entry.dueAt <= ts) {
			leaseHeap.pop();
			const item = items.get(entry.id);
			if (
				item &&
				item.runtime.version === entry.version &&
				(item.runtime.state === "leased" || item.runtime.state === "running")
			) {
				transitionItem(item, "abandoned", "system", ts, "lease-expired");
				item.runtime.leaseExpiresAt = undefined;
				persistItem(item, ts);
				scheduleCleanup(item, ts, abandonedRetentionMs);
				telemetry.incrementCounter(METRIC_NAMES.abandonedTotal, 1, {
					type: item.type,
				});
			}
			entry = leaseHeap.peek();
		}

		// Process cleanup (terminal/abandoned item removal)
		entry = cleanupHeap.peek();
		while (entry && entry.dueAt <= ts) {
			cleanupHeap.pop();
			const item = items.get(entry.id);
			if (
				item &&
				item.runtime.version === entry.version &&
				(item.runtime.state === "completed" ||
					item.runtime.state === "error" ||
					item.runtime.state === "abandoned")
			) {
				items.delete(item.id);
				durableStore.record({ kind: "delete-item", at: ts, itemId: item.id });
			}
			entry = cleanupHeap.peek();
		}

		// Evict stale workers
		for (const [workerId, worker] of liveWorkers) {
			const proposedAt = worker.proposedAt ?? 0;
			if (ts - proposedAt > peerTtlMs) {
				liveWorkers.delete(workerId);
			}
		}

		compactPendingQueue();
		publishGauges();
	}

	// ── return orchestrator object ───────────────────────────────────────

	return {
		async start(): Promise<void> {
			const snapshot = await durableStore.load();
			if (snapshot && snapshot.selfPeerId === selfPeer.id) {
				peers.clear();
				for (const peer of snapshot.peers) {
					peers.set(peer.id, clone(peer));
				}
				peers.set(selfPeer.id, clone(selfPeer));

				items.clear();
				pendingQueue = [];
				pendingHead = 0;
				const ts = now();
				for (const item of snapshot.items) {
					items.set(item.id, clone(item));
					reindexItem(item, ts);
				}
			}
			publishGauges();
		},

		async close(): Promise<void> {
			await durableStore.close(makeSnapshot());
		},

		tick,

		upsertPeer(
			peer: Omit<PeerInfo, "lastSeenAt"> & { lastSeenAt?: number },
		): void {
			const ts = now();
			const next: PeerInfo = {
				id: peer.id,
				endpoint: peer.endpoint,
				incarnation: peer.incarnation,
				lastSeenAt: peer.lastSeenAt ?? ts,
				metadata: peer.metadata,
			};
			peers.set(next.id, next);
			durableStore.record({ kind: "upsert-peer", at: ts, peer: clone(next) });
			publishGauges();
		},

		removePeer(peerId: string): void {
			if (peerId === selfPeer.id) return;
			const ts = now();
			peers.delete(peerId);
			durableStore.record({ kind: "delete-peer", at: ts, peerId });
			publishGauges();
		},

		listKnownPeers(): PeerInfo[] {
			return Array.from(peers.values()).map(clone);
		},

		listLivePeerIds(): string[] {
			return listLivePeerIds(now());
		},

		schedule<P = unknown>(input: ScheduleInput<P>): ScheduleResult {
			const ts = now();
			tick(ts);

			if (input.payloadBytes > workItemPayloadMaxBytes) {
				throw new Error(
					`payloadBytes ${input.payloadBytes} exceeds workItemPayloadMaxBytes ${workItemPayloadMaxBytes}`,
				);
			}

			const preferredOwnerId = pickResponsiblePeer(
				input.id,
				listLivePeerIds(ts),
			);
			if (!preferredOwnerId) {
				throw new Error("Cannot schedule work item without any live peers");
			}

			if (preferredOwnerId !== selfPeer.id) {
				const owner = peers.get(preferredOwnerId);
				telemetry.incrementCounter(METRIC_NAMES.redirectTotal, 1, {
					reason: "schedule-not-owner",
				});
				return {
					kind: "redirect",
					ownerPeerId: preferredOwnerId,
					ownerEndpoint: owner?.endpoint,
				};
			}

			const existing = items.get(input.id);
			if (existing) {
				return {
					kind: "accepted",
					ownerPeerId: existing.runtime.ownerPeerId ?? selfPeer.id,
					item: clone(existing),
				};
			}

			const item: WorkItem<P> = {
				id: input.id,
				type: input.type,
				payload: clone(input.payload),
				payloadBytes: input.payloadBytes,
				debug: input.debug,
				options: clone(input.options),
				errors: [],
				stateChanges: [],
				retryDelayTimes: [],
				runtime: {
					state: "pending",
					ownerPeerId: selfPeer.id,
					attempt: 0,
					maxRetries: input.options?.maxRetries ?? workItemMaxRetries,
					createdAt: ts,
					updatedAt: ts,
					version: 0,
				},
			};

			transitionItem(item, "pending", "client", ts, "scheduled");
			items.set(item.id, item as WorkItem);
			pendingQueue.push(item.id);
			persistItem(item as WorkItem, ts);
			telemetry.incrementCounter(METRIC_NAMES.scheduledTotal, 1, {
				type: input.type,
			});
			publishGauges();

			return {
				kind: "accepted",
				ownerPeerId: selfPeer.id,
				item: clone(item as WorkItem),
			};
		},

		leaseNextWork(request: LeaseRequest<TTelemetry>): LeaseResult {
			const ts = now();
			tick(ts);

			liveWorkers.set(request.worker.id, {
				...clone(request.worker),
				proposedAt: ts,
			});

			const candidates: WorkItemCandidate[] = [];
			const seen = new Set<string>();
			let scanned = 0;

			for (let index = pendingHead; index < pendingQueue.length; index++) {
				const itemId = pendingQueue[index];
				if (itemId === undefined || seen.has(itemId)) continue;
				seen.add(itemId);
				const item = items.get(itemId);
				if (!item) continue;
				if (item.runtime.state !== "pending") continue;
				if ((item.runtime.ownerPeerId ?? selfPeer.id) !== selfPeer.id) continue;

				candidates.push({
					id: item.id,
					type: item.type,
					payloadBytes: item.payloadBytes,
					createdAt: item.runtime.createdAt,
					availableAt: item.runtime.nextAttemptAt ?? item.runtime.createdAt,
					attempt: item.runtime.attempt,
					priority: item.options?.priority,
					affinityKey: item.options?.affinityKey,
					requiredCapabilities: item.options?.requiredCapabilities,
					estimatedCost: item.options?.estimatedCost,
				});

				scanned++;
				if (scanned >= candidateScanLimit) break;
			}

			if (candidates.length === 0) {
				publishGauges();
				return { kind: "empty" };
			}

			const chosenId = (selectWorkItemForWorker as (
				input: { worker: Readonly<WorkerProposal<TTelemetry>>; candidates: readonly Readonly<WorkItemCandidate>[]; now: number },
			) => string | undefined)({
				worker: request.worker,
				candidates,
				now: ts,
			});

			if (!chosenId) {
				publishGauges();
				return { kind: "empty" };
			}

			const item = items.get(chosenId);
			if (!item || item.runtime.state !== "pending") {
				publishGauges();
				return { kind: "empty" };
			}

			item.runtime.workerId = request.worker.id;
			item.runtime.leaseExpiresAt = ts + workItemMaxTimeResponsibleMs;
			transitionItem(item, "leased", "system", ts, "leased-to-worker");
			leaseHeap.push({
				id: item.id,
				dueAt: item.runtime.leaseExpiresAt,
				version: item.runtime.version,
			});
			persistItem(item, ts);
			telemetry.incrementCounter(METRIC_NAMES.leasedTotal, 1, {
				type: item.type,
			});
			telemetry.recordHistogram(
				METRIC_NAMES.leaseLatencyMs,
				ts - item.runtime.createdAt,
				{ type: item.type },
			);
			publishGauges();

			return { kind: "leased", workItem: clone(item) };
		},

		reportStarted(input: { id: string; workerId: string }): StatusResult {
			const ts = now();
			const item = items.get(input.id);
			if (!item) return getStatus(input.id);
			if (item.runtime.ownerPeerId !== selfPeer.id) return getStatus(input.id);
			if (item.runtime.workerId !== input.workerId) return getStatus(input.id);
			if (item.runtime.state !== "leased")
				return { kind: "local", item: clone(item) };

			transitionItem(item, "running", "worker", ts, "worker-started");
			persistItem(item, ts);
			telemetry.incrementCounter(METRIC_NAMES.startedTotal, 1, {
				type: item.type,
			});
			publishGauges();
			return { kind: "local", item: clone(item) };
		},

		reportCompleted<R = unknown>(input: CompletionReport<R>): StatusResult {
			const ts = now();
			const item = items.get(input.id);
			if (!item) return getStatus(input.id);
			if (item.runtime.ownerPeerId !== selfPeer.id) return getStatus(input.id);
			if (item.runtime.workerId !== input.workerId) return getStatus(input.id);

			item.result = clone(input.result.result) as WorkItem["result"];
			if (input.result.error) {
				item.errors.push(clone(input.result.error));
			}

			transitionItem(
				item,
				input.result.success ? "completed" : "error",
				"worker",
				ts,
				input.result.success
					? "worker-completed"
					: "worker-returned-unsuccessful-result",
			);
			item.runtime.leaseExpiresAt = undefined;
			persistItem(item, ts);
			scheduleCleanup(item, ts, terminalRetentionMs);
			telemetry.incrementCounter(
				input.result.success
					? METRIC_NAMES.completedTotal
					: METRIC_NAMES.failedTotal,
				1,
				{ type: item.type },
			);
			telemetry.recordHistogram(
				METRIC_NAMES.workDurationMs,
				ts - item.runtime.createdAt,
				{ type: item.type },
			);
			publishGauges();
			return { kind: "local", item: clone(item) };
		},

		reportFailed(input: FailureReport): StatusResult {
			const ts = now();
			const item = items.get(input.id);
			if (!item) return getStatus(input.id);
			if (item.runtime.ownerPeerId !== selfPeer.id) return getStatus(input.id);
			if (item.runtime.workerId !== input.workerId) return getStatus(input.id);

			item.errors.push(clone(input.error));

			const retryEnabled = item.options?.retry ?? true;
			const nextAttempt = item.runtime.attempt + 1;
			const maxRetries = item.runtime.maxRetries;
			const canRetry = retryEnabled && nextAttempt <= maxRetries;

			if (canRetry) {
				const delay = computeRetryDelay(item, nextAttempt);
				item.runtime.attempt = nextAttempt;
				item.runtime.nextAttemptAt = ts + delay;
				item.retryDelayTimes.push(delay);
				transitionItem(
					item,
					"retry-wait",
					"worker",
					ts,
					"worker-failed-will-retry",
				);
				retryHeap.push({
					id: item.id,
					dueAt: item.runtime.nextAttemptAt,
					version: item.runtime.version,
				});
				persistItem(item, ts);
				telemetry.incrementCounter(METRIC_NAMES.retriedTotal, 1, {
					type: item.type,
				});
				telemetry.recordHistogram(METRIC_NAMES.retryDelayMs, delay, {
					type: item.type,
				});
			} else {
				item.runtime.attempt = nextAttempt;
				transitionItem(
					item,
					"error",
					"worker",
					ts,
					"worker-failed-terminal",
				);
				item.runtime.leaseExpiresAt = undefined;
				item.runtime.nextAttemptAt = undefined;
				persistItem(item, ts);
				scheduleCleanup(item, ts, terminalRetentionMs);
				telemetry.incrementCounter(METRIC_NAMES.failedTotal, 1, {
					type: item.type,
				});
			}

			publishGauges();
			return { kind: "local", item: clone(item) };
		},

		getStatus,

		getSuggestedOwner(id: string): PeerInfo | undefined {
			const suggestedOwnerId = pickResponsiblePeer(
				id,
				listLivePeerIds(now()),
			);
			return suggestedOwnerId
				? clone(peers.get(suggestedOwnerId))
				: undefined;
		},

		snapshot(): { peers: PeerInfo[]; items: WorkItem[] } {
			return makeSnapshot();
		},
	};
}
