export type WorkItemType = "google_search" | "116117_arztsuche";

/** Serializable error envelope (DSON-safe, no Error prototype) */
export interface WorkItemError {
  name: string;
  message: string;
  stack?: string;
}

/** Result returned by a tool after processing a work item */
export interface WorkItemResult<R = unknown> {
  success: boolean;
  result?: R;
  error?: WorkItemError;
}

/** Options controlling how a work item is executed */
export interface WorkItemOptions {
  /** Whether to focus/activate the automated tab (default: true) */
  focusAutomation?: boolean;
  /** Whether to close the tab after work/tool completion (default: true) */
  closeTab?: boolean;
  /** Whether to retry on failure (default: true) */
  retry?: boolean;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay in ms before the first retry (default: 2000) */
  retryDelayMs?: number;
  /** Exponential backoff multiplier applied to retryDelayMs after each attempt (default: 1.5) */
  retryExponentialBackoff?: number;
}

export type WorkItemStatus = "pending" | "in-progress" | "completed" | "failed";

export interface WorkItem<P = unknown, R = unknown> {
  id: string; // UUID
  type: WorkItemType;
  status: WorkItemStatus;
  payload: P;
  /** When true, keep diagnostic tabs open after execution */
  debug?: boolean;
  /** Execution options */
  options?: WorkItemOptions;
  result?: R;
  success?: boolean;
  error?: WorkItemError;
}
