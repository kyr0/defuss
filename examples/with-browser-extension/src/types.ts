export type WorkItemType = "google_search";

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
}

export interface WorkItem<P = unknown, R = unknown> {
  id: string; // UUID
  type: WorkItemType;
  payload: P;
  /** When true, keep diagnostic tabs open after execution */
  debug?: boolean;
  /** Execution options */
  options?: WorkItemOptions;
  result?: R;
  success?: boolean;
  error?: WorkItemError;
}
