import type {
	SelectWorkItemForWorkerFn,
	SelectWorkerForWorkItemFn,
	WorkSelectionInput,
	WorkerSelectionInput,
} from "./types.js";

/** Safely coerces an unknown value to a finite number, returning `fallback` otherwise. */
function safeNumber(input: unknown, fallback = 0): number {
	return typeof input === "number" && Number.isFinite(input) ? input : fallback;
}

/**
 * Default work-item selection function: given a requesting worker and a set of
 * pending items, returns the ID of the best match.
 *
 * **Filter criteria** (items are skipped if they fail any):
 * - `availableAt` must be ≤ `now`
 * - worker must possess every `requiredCapability`
 * - item `payloadBytes` must not exceed worker's `maxPayloadBytes`
 *
 * **Scoring formula:**
 * ```
 * priority × 1 000 000
 * + ageMs
 * + affinityBonus  (5 000 if worker tag matches item affinityKey)
 * − retryPenalty    (attempt × 1 000)
 * − cpuPenalty      (cpuLoad × 10 000)
 * − memPenalty      (memoryUsageRatio × 8 000)
 * − inflightPenalty (inflight × 2 000)
 * − costPenalty     (estimatedCost × 10)
 * ```
 *
 * Higher priority and older items score higher.  Busy or hot workers are
 * penalised, nudging work toward cooler nodes.
 */
export const defaultSelectWorkItemForWorker: SelectWorkItemForWorkerFn = (
	input: WorkSelectionInput,
) => {
	const { worker, candidates, now } = input;

	let bestId: string | undefined;
	let bestScore = Number.NEGATIVE_INFINITY;

	for (const item of candidates) {
		if (item.availableAt > now) continue;

		if (
			item.requiredCapabilities &&
			!item.requiredCapabilities.every((cap) =>
				worker.capabilities.includes(cap),
			)
		) {
			continue;
		}

		if (
			worker.maxPayloadBytes !== undefined &&
			item.payloadBytes > worker.maxPayloadBytes
		) {
			continue;
		}

		const priority = item.priority ?? 0;
		const ageMs = now - item.createdAt;
		const retryPenalty = item.attempt * 1_000;
		const affinityBonus =
			item.affinityKey && worker.tags?.includes(item.affinityKey) ? 5_000 : 0;
		const telemetry = (worker.telemetry ?? {}) as Record<string, unknown>;
		const cpuPenalty = safeNumber(telemetry.cpuLoad) * 10_000;
		const memPenalty = safeNumber(telemetry.memoryUsageRatio) * 8_000;
		const inflightPenalty = worker.inflight * 2_000;
		const estimatedCostPenalty = (item.estimatedCost ?? 0) * 10;

		const score =
			priority * 1_000_000 +
			ageMs +
			affinityBonus -
			retryPenalty -
			cpuPenalty -
			memPenalty -
			inflightPenalty -
			estimatedCostPenalty;

		if (score > bestScore) {
			bestScore = score;
			bestId = item.id;
		}
	}

	return bestId;
};

/**
 * Default worker selection function: given one work item and a set of worker
 * proposals, returns the ID of the best-fit worker.
 *
 * **Filter criteria:**
 * - worker must possess every `requiredCapability` of the item
 * - item `payloadBytes` must not exceed worker's `maxPayloadBytes`
 *
 * **Scoring formula:**
 * ```
 * affinityBonus      (5 000 if worker tag matches item affinityKey)
 * + (1 − cpuLoad)    × 4 000
 * + (1 − memUsage)   × 3 000
 * + (1 − gpuLoad)    × 2 000
 * + (1 − vramUsage)  × 2 000
 * − inflight         × 1 000
 * ```
 *
 * Workers with lower load and fewer in-flight items score higher.
 */
export const defaultSelectWorkerForWorkItem: SelectWorkerForWorkItemFn = (
	input: WorkerSelectionInput,
) => {
	const { workItem, proposals } = input;

	let bestId: string | undefined;
	let bestScore = Number.NEGATIVE_INFINITY;

	for (const worker of proposals) {
		const required = workItem.options?.requiredCapabilities;
		if (
			required &&
			!required.every((cap) => worker.capabilities.includes(cap))
		) {
			continue;
		}

		if (
			worker.maxPayloadBytes !== undefined &&
			workItem.payloadBytes > worker.maxPayloadBytes
		) {
			continue;
		}

		const telemetry = (worker.telemetry ?? {}) as Record<string, unknown>;
		const cpuLoad = safeNumber(telemetry.cpuLoad);
		const memUsage = safeNumber(telemetry.memoryUsageRatio);
		const gpuLoad = safeNumber(telemetry.gpuLoad);
		const vramUsage = safeNumber(telemetry.vramUsageRatio);
		const affinityBonus =
			workItem.options?.affinityKey &&
			worker.tags?.includes(workItem.options.affinityKey)
				? 5_000
				: 0;

		const score =
			affinityBonus +
			(1 - cpuLoad) * 4_000 +
			(1 - memUsage) * 3_000 +
			(1 - gpuLoad) * 2_000 +
			(1 - vramUsage) * 2_000 -
			worker.inflight * 1_000;

		if (score > bestScore) {
			bestScore = score;
			bestId = worker.id;
		}
	}

	return bestId;
};
