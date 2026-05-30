import type { WorkItem, WorkItemResult } from "../types.js";

// -- Work item queue (in-memory) --

/** Items waiting to be picked up by the extension */
export const pendingWorkItems = new Map<string, WorkItem>();

/** Items currently being processed by an extension */
export const inProgressWorkItems = new Map<string, WorkItem>();

/** Completed items with their results */
export const completedWorkItems = new Map<
  string,
  WorkItem & { completedAt: number }
>();

/** Promise resolvers waiting for a specific work item to complete */
export const completionResolvers = new Map<
  string,
  { resolve: (item: WorkItem) => void; reject: (err: Error) => void }
>();

/** Enqueue a work item for the extension to pick up. */
export function enqueueWorkItem<P = unknown, R = unknown>(
  item: Omit<WorkItem<P, R>, "id" | "status">,
): WorkItem<P, R> {
  const id = crypto.randomUUID();
  const workItem: WorkItem<P, R> = { id, status: "pending", ...item };
  pendingWorkItems.set(id, workItem as WorkItem);
  console.log(`[orchestration] enqueued work item ${id} (type: ${item.type})`);
  return workItem;
}

/**
 * Atomically claim all pending work items. Moves them from `pending` to
 * `in-progress` so no other caller receives the same items.
 */
export function claimWorkItems(): WorkItem[] {
  const items = Array.from(pendingWorkItems.values());
  for (const item of items) {
    pendingWorkItems.delete(item.id);
    item.status = "in-progress";
    inProgressWorkItems.set(item.id, item);
  }
  if (items.length > 0) {
    console.log(
      `[orchestration] claimed ${items.length} item(s) (${pendingWorkItems.size} pending, ${inProgressWorkItems.size} in-progress)`,
    );
  }
  return items;
}

/** Return all pending (not-yet-completed) work items. */
export function getPendingItems(): WorkItem[] {
  return Array.from(pendingWorkItems.values());
}

/** Return all completed work items. */
export function getCompletedItems(): Array<WorkItem & { completedAt: number }> {
  return Array.from(completedWorkItems.values());
}

/**
 * Mark a work item as completed (called by the RPC handler when the
 * extension submits a result). Resolves any pending `observeWorkItem` promise.
 */
export function completeWorkItem(id: string, result: WorkItemResult): void {
  // Item may be in-progress (normal path) or still pending (legacy/edge case)
  const item = inProgressWorkItems.get(id) ?? pendingWorkItems.get(id);

  if (!item) {
    console.warn(
      `[orchestration] received result for unknown/already-completed item ${id}`,
    );
    return;
  }

  // Remove from whichever map it was in
  inProgressWorkItems.delete(id);
  pendingWorkItems.delete(id);

  if (result.success) {
    const completed = {
      ...item,
      status: "completed" as const,
      result: result.result,
      success: true,
      completedAt: Date.now(),
    };
    completedWorkItems.set(id, completed);
    console.log(
      `[orchestration] work item ${id} completed successfully (${pendingWorkItems.size} pending, ${inProgressWorkItems.size} in-progress, ${completedWorkItems.size} done)`,
    );

    // Resolve any awaiting observer
    const resolver = completionResolvers.get(id);
    if (resolver) {
      completionResolvers.delete(id);
      resolver.resolve(completed);
    }
  } else {
    item.status = "failed";
    console.warn(`[orchestration] work item ${id} failed:`, result.error);

    // Reject any awaiting observer
    const resolver = completionResolvers.get(id);
    if (resolver) {
      completionResolvers.delete(id);
      const errMsg = result.error?.message ?? "Work item failed";
      const err = new Error(errMsg);
      err.name = result.error?.name ?? "WorkItemError";
      resolver.reject(err);
    }
  }
}

/**
 * Observe a work item by ID. Returns a promise that resolves with the
 * completed work item once the extension finishes processing it.
 * If the item is already completed, resolves immediately.
 */
export function observeWorkItem<P = unknown, R = unknown>(
  id: string,
): Promise<WorkItem<P, R>> {
  // Already completed?
  const completed = completedWorkItems.get(id);
  if (completed) return Promise.resolve(completed as unknown as WorkItem<P, R>);

  // Not even known?
  if (
    !pendingWorkItems.has(id) &&
    !inProgressWorkItems.has(id) &&
    !completedWorkItems.has(id)
  ) {
    return Promise.reject(new Error(`Unknown work item: ${id}`));
  }

  // Wait for completion
  return new Promise<WorkItem<P, R>>((resolve, reject) => {
    completionResolvers.set(id, {
      resolve: resolve as (item: WorkItem) => void,
      reject,
    });
  });
}

/**
 * Enqueue a work item and wait for the extension to process it.
 * Returns the completed work item with its typed result.
 *
 * @example
 * ```ts
 * import type { GoogleSearchPayload, GoogleSearchResult } from "../tools/google-search.js";
 *
 * const item = await doWorkItem<GoogleSearchPayload, GoogleSearchResult>({
 *   type: "google_search",
 *   payload: { query: "defuss framework", ai_summary: true },
 * });
 * console.log(item.result); // string
 * ```
 */
export async function doWorkItem<P = unknown, R = unknown>(
  item: Omit<WorkItem<P, R>, "id" | "status">,
): Promise<WorkItem<P, R>> {
  const workItem = enqueueWorkItem<P, R>(item);
  return observeWorkItem<P, R>(workItem.id);
}
