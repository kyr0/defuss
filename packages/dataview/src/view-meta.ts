import { createDataview } from "./dataview.js";
import type {
  DataviewJsonValue,
  DataviewMeta,
  DataviewState,
} from "./types.js";

const recreateDataview = <T extends DataviewState>(
  view: T,
  meta: DataviewMeta,
): T => {
  return createDataview({
    filters: view.filters,
    sorters: view.sorters,
    page: view.page,
    pageSize: view.pageSize,
    meta,
    tree: view.tree,
  }) as T;
};

export const updateMeta = <T extends DataviewState>(
  view: T,
  updates: Partial<DataviewMeta>,
): T => recreateDataview(view, { ...view.meta, ...updates });

export const setSelectedRows = <T extends DataviewState>(
  view: T,
  selectedRowIds: DataviewJsonValue[],
): T => updateMeta(view, { selectedRowIds });

export const toggleSelectedRow = <T extends DataviewState>(
  view: T,
  rowId: DataviewJsonValue,
): T => {
  const selected = new Set(view.meta.selectedRowIds);

  if (selected.has(rowId)) {
    selected.delete(rowId);
  } else {
    selected.add(rowId);
  }

  return setSelectedRows(view, [...selected]);
};

export const setLockedColumns = <T extends DataviewState>(
  view: T,
  lockedColumns: string[],
): T => updateMeta(view, { lockedColumns });

export const setExpandedIds = <T extends DataviewState>(
  view: T,
  expandedIds: DataviewJsonValue[],
): T => {
  if (!view.tree) {
    return view;
  }

  return createDataview({
    filters: view.filters,
    sorters: view.sorters,
    page: view.page,
    pageSize: view.pageSize,
    meta: view.meta,
    tree: {
      ...view.tree,
      expandedIds,
    },
  }) as T;
};

export const toggleExpanded = <T extends DataviewState>(
  view: T,
  rowId: DataviewJsonValue,
): T => {
  if (!view.tree) {
    return view;
  }

  const expanded = new Set(view.tree.expandedIds);

  if (expanded.has(rowId)) {
    expanded.delete(rowId);
  } else {
    expanded.add(rowId);
  }

  return setExpandedIds(view, [...expanded]);
};
