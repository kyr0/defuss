import type { DataviewRow } from "./types.js";

const toIdKey = (value: unknown): string => JSON.stringify(value);

export const updateRows = <T extends DataviewRow>(
  rows: T[],
  ids: unknown[],
  updates: Array<Partial<T>>,
  idField = "id",
): T[] => {
  if (ids.length !== updates.length) {
    throw new Error("updateRows expects ids and updates arrays with equal length.");
  }

  if (ids.length === 0) {
    return rows;
  }

  const updateById = new Map<string, Partial<T>>();

  for (let index = 0; index < ids.length; index++) {
    updateById.set(toIdKey(ids[index]), updates[index]);
  }

  let changed = false;
  const nextRows = rows.map((row) => {
    const id = row[idField as keyof T];
    const patch = updateById.get(toIdKey(id));

    if (!patch) {
      return row;
    }

    changed = true;
    return {
      ...row,
      ...patch,
    };
  });

  return changed ? nextRows : rows;
};

export const addRows = <T extends DataviewRow>(
  rows: T[],
  newRows: T[],
  anchorId?: unknown,
  position: "before" | "after" = "after",
  idField = "id",
): T[] => {
  if (newRows.length === 0) {
    return rows;
  }

  if (rows.length === 0) {
    return [...newRows];
  }

  if (anchorId === undefined) {
    return [...rows, ...newRows];
  }

  const anchorKey = toIdKey(anchorId);
  const anchorIndex = rows.findIndex((row) => toIdKey(row[idField as keyof T]) === anchorKey);

  if (anchorIndex === -1) {
    return [...rows, ...newRows];
  }

  const insertIndex = position === "before" ? anchorIndex : anchorIndex + 1;

  return [
    ...rows.slice(0, insertIndex),
    ...newRows,
    ...rows.slice(insertIndex),
  ];
};

export const removeRows = <T extends DataviewRow>(
  rows: T[],
  ids: unknown[],
  idField = "id",
): T[] => {
  if (ids.length === 0) {
    return rows;
  }

  const idSet = new Set(ids.map((id) => toIdKey(id)));
  const nextRows = rows.filter((row) => !idSet.has(toIdKey(row[idField as keyof T])));

  return nextRows.length === rows.length ? rows : nextRows;
};

export const setParent = <T extends DataviewRow>(
  rows: T[],
  nodeId: unknown,
  parentId: unknown,
  idField = "id",
  parentIdField = "parentId",
): T[] => {
  if (rows.length === 0) {
    return rows;
  }

  const nodeKey = toIdKey(nodeId);
  let changed = false;

  const nextRows = rows.map((row) => {
    const rowId = row[idField as keyof T];
    if (toIdKey(rowId) !== nodeKey) {
      return row;
    }

    const currentParentId = row[parentIdField as keyof T];
    if (Object.is(currentParentId, parentId)) {
      return row;
    }

    changed = true;
    return {
      ...row,
      [parentIdField]: parentId,
    };
  });

  return changed ? nextRows : rows;
};
