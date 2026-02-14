import { applyDataview, createDataview } from "./dataview.js";
import {
  patchMeta,
  setLockedColumns,
  setSelectedRows,
  setExpandedIds,
  toggleSelectedRow,
  toggleExpanded,
} from "./view-meta.js";

import {
  applyTreeDataview,
  applyTreeDataviewWithMeta,
  createTreeDataview,
} from "./tree-dataview.js";

export * from "./types.js";
export {
  applyDataview,
  createDataview,
  applyTreeDataview,
  applyTreeDataviewWithMeta,
  createTreeDataview,
  patchMeta,
  setLockedColumns,
  setSelectedRows,
  setExpandedIds,
  toggleSelectedRow,
  toggleExpanded,
};

export const Dataview = {
  createDataview,
  applyDataview,
  patchMeta,
  setSelectedRows,
  toggleSelectedRow,
  setLockedColumns,
};

export const ExperimentalDataview = {
  createTreeDataview,
  applyTreeDataview,
  applyTreeDataviewWithMeta,
  setSelectedRows,
  toggleSelectedRow,
  setExpandedIds,
  toggleExpanded,
};
