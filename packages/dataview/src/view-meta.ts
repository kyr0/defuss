import { createDataview } from "./dataview.js";
import { createTreeDataview } from "./tree-dataview.js";
import type {
  DataviewJsonValue,
  DataviewMeta,
  DataviewState,
  TreeDataviewState,
} from "./types.js";

type AnyDataviewState = DataviewState | TreeDataviewState;

const isTreeDataviewState = (view: AnyDataviewState): view is TreeDataviewState =>
  "tree" in view;

const recreateDataview = <T extends AnyDataviewState>(
  view: T,
  meta: DataviewMeta,
): T => {
  if (isTreeDataviewState(view)) {
    return createTreeDataview({
      filters: view.filters,
      sorters: view.sorters,
      page: view.page,
      pageSize: view.pageSize,
      meta,
      tree: view.tree,
    }) as T;
  }

  return createDataview({
    filters: view.filters,
    sorters: view.sorters,
    page: view.page,
    pageSize: view.pageSize,
    meta,
  }) as T;
};

export const patchMeta = <T extends AnyDataviewState>(
  view: T,
  patch: Partial<DataviewMeta>,
): T => recreateDataview(view, { ...view.meta, ...patch });

export const setSelectedRows = <T extends AnyDataviewState>(
  view: T,
  selectedRowIds: DataviewJsonValue[],
): T => patchMeta(view, { selectedRowIds });

export const toggleSelectedRow = <T extends AnyDataviewState>(
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

export const setLockedColumns = <T extends AnyDataviewState>(
  view: T,
  lockedColumns: string[],
): T => patchMeta(view, { lockedColumns });

export const setExpandedIds = <T extends AnyDataviewState>(
  view: T,
  expandedIds: DataviewJsonValue[],
): T => {
  if (!isTreeDataviewState(view)) {
    return view;
  }

  return createTreeDataview({
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

export const toggleExpanded = <T extends AnyDataviewState>(
  view: T,
  rowId: DataviewJsonValue,
): T => {
  if (!isTreeDataviewState(view)) {
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
