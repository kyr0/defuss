export type WorkItemType = "google_search";

export interface WorkItem<P = unknown, R = unknown> {
  id: string; // UUID
  type: WorkItemType;
  payload: P;
  result?: R;
}
