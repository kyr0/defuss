/** JSON-compatible primitive value. */
export type JsonPrimitive = string | number | boolean | null;
/** Recursively JSON-compatible value (primitive, object, or array). */
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
/** Plain object whose values are JSON-compatible. */
export interface JsonObject {
	[key: string]: JsonValue;
}

/** Structured error captured when a work item fails. */
export interface WorkItemError {
	name: string;
	message: string;
	stack?: string;
	code?: string;
	/** Epoch-ms timestamp when the error occurred. */
	at: number;
	/** Zero-based attempt number that produced this error. */
	attempt: number;
}

/** Outcome of a work item execution, either successful or failed. */
export interface WorkItemResult<R = unknown> {
	success: boolean;
	result?: R;
	error?: WorkItemError;
}

/** Immutable log entry recording a single state machine transition. */
export interface WorkItemStateChange {
	at: number;
	from: WorkItemState | null;
	to: WorkItemState;
	by: "system" | "worker" | "client" | "peer";
	note?: string;
}

/**
 * Runtime state machine states for a work item.
 *
 * Typical happy path: `pending` → `leased` → `running` → `completed`.
 * Failure with retries: `running` → `retry-wait` → `pending` → …
 * Terminal error: `running` → `error`.
 * Lease timeout: `leased | running` → `abandoned`.
 */
export type WorkItemState =
	| "pending"
	| "leased"
	| "running"
	| "retry-wait"
	| "completed"
	| "error"
	| "abandoned"
	| "transferring";

/** Mutable runtime bookkeeping for a work item. */
export interface WorkItemRuntime {
	state: WorkItemState;
	ownerPeerId?: string;
	workerId?: string;
	attempt: number;
	maxRetries: number;
	nextAttemptAt?: number;
	leaseExpiresAt?: number;
	createdAt: number;
	updatedAt: number;
	version: number;
}

/** Per-item scheduling options provided by the caller at schedule time. */
export interface WorkItemOptions {
	retry?: boolean;
	maxRetries?: number;
	retryDelayMs?: number;
	retryExponentialBackoff?: number;
	priority?: number;
	affinityKey?: string;
	requiredCapabilities?: readonly string[];
	estimatedCost?: number;
	metadata?: Record<string, JsonValue>;
}

/** Full work item record held in memory by the orchestrator. */
export interface WorkItem<P = unknown, R = unknown> {
	id: string;
	type: string;
	payload: P;
	payloadBytes: number;
	debug?: boolean;
	options?: WorkItemOptions;
	runtime: WorkItemRuntime;
	result?: R;
	errors: WorkItemError[];
	stateChanges: WorkItemStateChange[];
	retryDelayTimes: number[];
}

/** Input provided by the caller to {@link Orchestrator.schedule}. */
export interface ScheduleInput<P = unknown> {
	id: string;
	type: string;
	payload: P;
	payloadBytes: number;
	debug?: boolean;
	options?: WorkItemOptions;
}

/** A worker's self-description, attached to each lease request. */
export interface WorkerProposal<TTelemetry = Record<string, JsonValue>> {
	id: string;
	capabilities: readonly string[];
	inflight: number;
	maxPayloadBytes?: number;
	tags?: readonly string[];
	telemetry?: TTelemetry;
	metadata?: Record<string, JsonValue>;
	proposedAt?: number;
}

/** Input supplied to {@link SelectWorkerForWorkItemFn} — one item plus all worker proposals. */
export interface WorkerSelectionInput<
	TTelemetry = Record<string, JsonValue>,
	P = unknown,
	R = unknown,
> {
	workItem: Readonly<WorkItem<P, R>>;
	proposals: readonly Readonly<WorkerProposal<TTelemetry>>[];
	now: number;
}

/**
 * Pluggable function that picks *which worker* should receive a specific work item.
 * Return the chosen worker's `id`, or `undefined` to skip.
 */
export type SelectWorkerForWorkItemFn<
	TTelemetry = Record<string, JsonValue>,
	P = unknown,
	R = unknown,
> = (input: WorkerSelectionInput<TTelemetry, P, R>) => string | undefined;

/** Lightweight projection of a pending work item surfaced to selection functions. */
export interface WorkItemCandidate {
	id: string;
	type: string;
	payloadBytes: number;
	createdAt: number;
	availableAt: number;
	attempt: number;
	priority?: number;
	affinityKey?: string;
	requiredCapabilities?: readonly string[];
	estimatedCost?: number;
}

/** Input supplied to {@link SelectWorkItemForWorkerFn} — one worker plus candidate items. */
export interface WorkSelectionInput<TTelemetry = Record<string, JsonValue>> {
	worker: Readonly<WorkerProposal<TTelemetry>>;
	candidates: readonly Readonly<WorkItemCandidate>[];
	now: number;
}

/**
 * Pluggable function that picks *which work item* a requesting worker should receive.
 * Return the chosen item's `id`, or `undefined` to skip.
 */
export type SelectWorkItemForWorkerFn<TTelemetry = Record<string, JsonValue>> =
	(input: WorkSelectionInput<TTelemetry>) => string | undefined;

/** Identity and liveness information about a peer in the federation. */
export interface PeerInfo<TMeta = Record<string, JsonValue>> {
	id: string;
	endpoint: string;
	incarnation: number;
	lastSeenAt: number;
	metadata?: TMeta;
}

/** Request payload for {@link Orchestrator.leaseNextWork}. */
export interface LeaseRequest<TTelemetry = Record<string, JsonValue>> {
	worker: WorkerProposal<TTelemetry>;
}

/** Schedule result when the local peer accepted the item. */
export interface AcceptedScheduleResult {
	kind: "accepted";
	ownerPeerId: string;
	item: Readonly<WorkItem>;
}

/** Schedule result when the item belongs to a different peer. */
export interface RedirectScheduleResult {
	kind: "redirect";
	ownerPeerId: string;
	ownerEndpoint?: string;
}

/** Discriminated union returned by {@link Orchestrator.schedule}. */
export type ScheduleResult = AcceptedScheduleResult | RedirectScheduleResult;

/** Lease result when work was successfully leased to the requesting worker. */
export interface LeasedWorkResult {
	kind: "leased";
	workItem: Readonly<WorkItem>;
}

/** Lease result when no eligible work is available. */
export interface EmptyLeaseResult {
	kind: "empty";
}

/** Discriminated union returned by {@link Orchestrator.leaseNextWork}. */
export type LeaseResult = LeasedWorkResult | EmptyLeaseResult;

/** Status result when the item is owned locally. */
export interface StatusLocalFound {
	kind: "local";
	item: Readonly<WorkItem>;
}

/** Status result when the local peer knows the owner from a prior accept. */
export interface StatusRedirectKnown {
	kind: "redirect-known";
	ownerPeerId: string;
	ownerEndpoint?: string;
}

/** Status result when the owner is guessed via current rendezvous hashing. */
export interface StatusRedirectSuggested {
	kind: "redirect-suggested";
	ownerPeerId: string;
	ownerEndpoint?: string;
}

/** Status result when the item is completely unknown to this peer. */
export interface StatusUnknown {
	kind: "unknown";
}

/** Discriminated union returned by status and report methods. */
export type StatusResult =
	| StatusLocalFound
	| StatusRedirectKnown
	| StatusRedirectSuggested
	| StatusUnknown;

/** Full snapshot of durable state, written on flush. */
export interface DurableStoreSnapshot {
	schemaVersion: 1;
	selfPeerId: string;
	peers: PeerInfo[];
	items: WorkItem[];
}

/** A single append-log record representing a mutation to durable state. */
export interface DurableStoreRecord {
	kind: "upsert-peer" | "delete-peer" | "put-item" | "delete-item";
	at: number;
	peer?: PeerInfo;
	peerId?: string;
	item?: WorkItem;
	itemId?: string;
}

/**
 * Persistence interface for the orchestrator.
 *
 * - {@link load} restores state on startup.
 * - {@link record} appends a mutation (must be non-blocking on the hot path).
 * - {@link flush} writes a full snapshot and clears the log.
 * - {@link close} persists final state before shutdown.
 */
export interface DurableStore {
	load(): Promise<DurableStoreSnapshot | undefined>;
	record(record: DurableStoreRecord): void;
	flush(snapshot: DurableStoreSnapshot): Promise<void>;
	close(snapshot: DurableStoreSnapshot): Promise<void>;
}

import type { Attributes, TelemetrySink } from "defuss-open-telemetry";
export type { Attributes as TelemetryAttributes, TelemetrySink };

/** Configuration for {@link createOrchestrator}. */
export interface OrchestratorConfig<TTelemetry = Record<string, JsonValue>> {
	self: Omit<PeerInfo, "lastSeenAt"> & { lastSeenAt?: number };
	peerTtlMs?: number;
	workItemMaxTimeResponsibleMs?: number;
	workItemMaxRetries?: number;
	workItemRetryDelayMs?: number;
	workItemRetryExponentialBackoff?: number;
	workItemPayloadMaxBytes?: number;
	candidateScanLimit?: number;
	terminalRetentionMs?: number;
	abandonedRetentionMs?: number;
	durableStore?: DurableStore;
	telemetry?: TelemetrySink;
	now?: () => number;
	selectWorkItemForWorker?: SelectWorkItemForWorkerFn<TTelemetry>;
}
