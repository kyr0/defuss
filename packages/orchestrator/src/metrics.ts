export { noopTelemetrySink } from "defuss-open-telemetry";

/** Canonical metric names emitted by the orchestrator via its {@link TelemetrySink}. */
export const METRIC_NAMES = {
	scheduledTotal: "work_items_scheduled_total",
	leasedTotal: "work_items_leased_total",
	startedTotal: "work_items_started_total",
	completedTotal: "work_items_completed_total",
	failedTotal: "work_items_failed_total",
	retriedTotal: "work_items_retried_total",
	abandonedTotal: "work_items_abandoned_total",
	redirectTotal: "ownership_redirect_total",
	pendingGauge: "pending_work_items",
	runningGauge: "running_work_items",
	retryWaitGauge: "retry_wait_work_items",
	livePeersGauge: "live_peers",
	liveWorkersGauge: "live_workers",
	leaseLatencyMs: "lease_latency_ms",
	workDurationMs: "work_duration_ms",
	retryDelayMs: "retry_delay_ms",
	persistenceFlushMs: "persistence_flush_ms",
} as const;
