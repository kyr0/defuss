import { getServerRpc } from "./server-rpc";
import { withRetry } from "./work-item-retry";
import type { WorkItem, WorkItemType, WorkItemResult } from "../../types";

/** Interface that each tool must implement to handle a specific work item type */
export interface WorkItemTool<P = unknown, R = unknown> {
  /** The work item type this tool handles (e.g. "google_search") */
  type: WorkItemType;
  /** Execute the tool in the service-worker context and return a result */
  executeInWorker(item: WorkItem<P>): Promise<WorkItemResult<R>>;
}

/** Scheduler that polls for work items and dispatches them to registered tools */
export class WorkItemScheduler {
  private tools = new Map<WorkItemType, WorkItemTool>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private processing = false;

  /** Register a tool to handle a specific work item type */
  register(tool: WorkItemTool): void {
    this.tools.set(tool.type, tool);
    console.log(`[scheduler] registered tool for "${tool.type}"`);
  }

  /** Start polling for work items at the given interval */
  start(intervalMs: number): void {
    if (this.intervalId !== null) return;
    console.log(`[scheduler] starting (interval: ${intervalMs}ms)`);
    this.intervalId = setInterval(() => this.poll(), intervalMs);
    // Run immediately on start as well
    this.poll();
  }

  /** Stop the polling loop */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[scheduler] stopped");
    }
  }

  // -- internals --

  private async poll(): Promise<void> {
    // Prevent overlapping poll cycles
    if (this.processing) return;
    this.processing = true;

    try {
      const rpc = await getServerRpc();
      const items = await rpc.JobApi.getWorkItems();
      console.log(`[scheduler] polled ${items.length} work item(s)`);

      for (const item of items) {
        await this.processItem(item);
      }
    } catch (err) {
      console.warn("[scheduler] poll failed:", err);
    } finally {
      this.processing = false;
    }
  }

  private async processItem(item: WorkItem): Promise<void> {
    const tool = this.tools.get(item.type);

    if (!tool) {
      console.warn(
        `[scheduler] no tool registered for type "${item.type}", skipping item ${item.id}`,
      );
      return;
    }

    const result = await withRetry(async () => {
      try {
        return await tool.executeInWorker(item);
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        return {
          success: false as const,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        };
      }
    }, item.options);

    // Submit result back to the server
    try {
      const rpc = await getServerRpc();
      await rpc.JobApi.submitWorkItemResult(item.id, result);
    } catch (err) {
      console.warn(
        `[scheduler] failed to submit result for item ${item.id}:`,
        err,
      );
    }
  }
}
