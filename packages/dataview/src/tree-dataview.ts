import { createDataview } from "./dataview.js";
import type {
  DataviewFilter,
  DataviewFilterOperator,
  DataviewJsonValue,
  DataviewRow,
  DataviewSortDirection,
  TreeDataviewEntry,
  TreeDataviewRequest,
  TreeRowMeta,
  TreeDataviewState,
  TreeDataviewTreeOptions,
} from "./types.js";

const FILTER_OPERATORS: DataviewFilterOperator[] = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "contains",
  "startsWith",
  "endsWith",
];

const SORT_DIRECTIONS: DataviewSortDirection[] = ["asc", "desc"];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getValueByParts = (row: DataviewRow, parts: string[]): unknown => {
  let current: unknown = row;

  for (const part of parts) {
    if (!isObject(current)) {
      return undefined;
    }

    current = current[part];
  }

  return current;
};

const compileAccessor = (field: string): ((row: DataviewRow) => unknown) => {
  const parts = field.split(".").filter(Boolean);
  return (row: DataviewRow): unknown => getValueByParts(row, parts);
};

const compareUnknown = (left: unknown, right: unknown): number => {
  if (left === right) {
    return 0;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left < right ? -1 : 1;
  }

  if (typeof left === "string" && typeof right === "string") {
    return left.localeCompare(right);
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return left === right ? 0 : left ? 1 : -1;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  return String(left).localeCompare(String(right));
};

const compareWithDirection = (
  left: unknown,
  right: unknown,
  direction: DataviewSortDirection,
): number => {
  const leftNullish = left == null;
  const rightNullish = right == null;

  if (leftNullish && rightNullish) {
    return 0;
  }

  if (leftNullish) {
    return direction === "asc" ? 1 : -1;
  }

  if (rightNullish) {
    return direction === "asc" ? -1 : 1;
  }

  const result = compareUnknown(left, right);
  return direction === "asc" ? result : result * -1;
};

const matchesFilter = (cellValue: unknown, filter: DataviewFilter): boolean => {
  const { op, value } = filter;

  switch (op) {
    case "eq":
      return cellValue === value;
    case "neq":
      return cellValue !== value;
    case "gt":
      return compareUnknown(cellValue, value) > 0;
    case "gte":
      return compareUnknown(cellValue, value) >= 0;
    case "lt":
      return compareUnknown(cellValue, value) < 0;
    case "lte":
      return compareUnknown(cellValue, value) <= 0;
    case "in": {
      if (!Array.isArray(value)) {
        return false;
      }

      return value.some((entry) => entry === cellValue);
    }
    case "contains": {
      if (typeof cellValue === "string" && typeof value === "string") {
        return cellValue.includes(value);
      }

      if (Array.isArray(cellValue)) {
        return cellValue.some((entry) => entry === value);
      }

      return false;
    }
    case "startsWith": {
      return typeof cellValue === "string" && typeof value === "string"
        ? cellValue.startsWith(value)
        : false;
    }
    case "endsWith": {
      return typeof cellValue === "string" && typeof value === "string"
        ? cellValue.endsWith(value)
        : false;
    }
    default:
      return false;
  }
};

const normalizeTreeOptions = (
  options: TreeDataviewTreeOptions,
): TreeDataviewState["tree"] => {
  if (!options?.idField || typeof options.idField !== "string") {
    throw new Error("Tree dataview idField must be a non-empty string.");
  }

  if (!options?.parentIdField || typeof options.parentIdField !== "string") {
    throw new Error("Tree dataview parentIdField must be a non-empty string.");
  }

  if (options.maxDepth != null) {
    if (!Number.isInteger(options.maxDepth) || options.maxDepth < 0) {
      throw new Error("Tree dataview maxDepth must be an integer >= 0.");
    }
  }

  return {
    idField: options.idField,
    parentIdField: options.parentIdField,
    expandedIds: options.expandedIds ?? [],
    maxDepth: options.maxDepth,
    includeAncestors: options.includeAncestors ?? true,
    includeDescendantsOfMatch: options.includeDescendantsOfMatch ?? false,
  };
};

export const createTreeDataview = (
  request: TreeDataviewRequest,
): TreeDataviewState => {
  const base = createDataview(request);
  const tree = normalizeTreeOptions(request.tree);

  for (const filter of base.filters) {
    if (!FILTER_OPERATORS.includes(filter.op)) {
      throw new Error(`Tree dataview filter op '${String(filter.op)}' is not supported.`);
    }
  }

  for (const sorter of base.sorters) {
    if (!SORT_DIRECTIONS.includes(sorter.direction)) {
      throw new Error(
        `Tree dataview sorter direction '${String(sorter.direction)}' is not supported.`,
      );
    }
  }

  return {
    ...base,
    tree,
  };
};

interface CompiledFilter {
  getValue: (row: DataviewRow) => unknown;
  test: (cellValue: unknown) => boolean;
}

interface CompiledSorter {
  getValue: (row: DataviewRow) => unknown;
  direction: DataviewSortDirection;
}

const compileFilter = (filter: DataviewFilter): CompiledFilter => {
  const getValue = compileAccessor(filter.field);

  if (filter.op === "in" && Array.isArray(filter.value)) {
    const allowedValues = new Set(filter.value);
    return {
      getValue,
      test: (cellValue: unknown) => allowedValues.has(cellValue as never),
    };
  }

  return {
    getValue,
    test: (cellValue: unknown) => matchesFilter(cellValue, filter),
  };
};

const compileSorter = (
  sorter: TreeDataviewState["sorters"][number],
): CompiledSorter => ({
  getValue: compileAccessor(sorter.field),
  direction: sorter.direction,
});

const makeComparator = <T extends DataviewRow>(
  rows: T[],
  sorters: CompiledSorter[],
): ((leftIndex: number, rightIndex: number) => number) => {
  if (sorters.length === 0) {
    return (leftIndex, rightIndex) => leftIndex - rightIndex;
  }

  return (leftIndex: number, rightIndex: number): number => {
    const left = rows[leftIndex];
    const right = rows[rightIndex];

    for (const sorter of sorters) {
      const comparison = compareWithDirection(
        sorter.getValue(left),
        sorter.getValue(right),
        sorter.direction,
      );

      if (comparison !== 0) {
        return comparison;
      }
    }

    return leftIndex - rightIndex;
  };
};

export const applyTreeDataview = <T extends DataviewRow>(
  rows: T[],
  dataview: TreeDataviewState,
): T[] => {
  return applyTreeDataviewWithMeta(rows, dataview).map((entry) => entry.row);
};

export const applyTreeDataviewWithMeta = <T extends DataviewRow>(
  rows: T[],
  dataview: TreeDataviewState,
): Array<TreeDataviewEntry<T>> => {
  if (rows.length === 0) {
    return [];
  }

  const getId = compileAccessor(dataview.tree.idField);
  const getParentId = compileAccessor(dataview.tree.parentIdField);

  const idValues = rows.map((row) => getId(row) as DataviewJsonValue);
  const parentValues = rows.map((row) => getParentId(row) as DataviewJsonValue);

  const idToIndex = new Map<DataviewJsonValue, number>();
  for (let index = 0; index < rows.length; index++) {
    const id = idValues[index];
    if (id != null && !idToIndex.has(id)) {
      idToIndex.set(id, index);
    }
  }

  const parentIndices = new Int32Array(rows.length);
  const childrenByParent = Array.from({ length: rows.length }, () => [] as number[]);
  const rootIndices: number[] = [];

  for (let index = 0; index < rows.length; index++) {
    const parentId = parentValues[index];
    const mappedParent = parentId != null ? idToIndex.get(parentId) : undefined;

    const parentIndex =
      mappedParent == null || mappedParent === index ? -1 : mappedParent;

    parentIndices[index] = parentIndex;

    if (parentIndex === -1) {
      rootIndices.push(index);
    } else {
      childrenByParent[parentIndex].push(index);
    }
  }

  const compiledSorters = dataview.sorters.map(compileSorter);
  const comparator = makeComparator(rows, compiledSorters);

  rootIndices.sort(comparator);
  for (const childIndices of childrenByParent) {
    childIndices.sort(comparator);
  }

  const compiledFilters = dataview.filters.map(compileFilter);
  const matched = new Uint8Array(rows.length);

  for (let index = 0; index < rows.length; index++) {
    if (compiledFilters.length === 0) {
      matched[index] = 1;
      continue;
    }

    let isMatch = true;
    for (const filter of compiledFilters) {
      if (!filter.test(filter.getValue(rows[index]))) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      matched[index] = 1;
    }
  }

  const include = matched.slice();

  if (dataview.tree.includeAncestors) {
    for (let index = 0; index < rows.length; index++) {
      if (matched[index] !== 1) {
        continue;
      }

      let parent = parentIndices[index];
      while (parent !== -1) {
        if (include[parent] === 1) {
          parent = parentIndices[parent];
          continue;
        }

        include[parent] = 1;
        parent = parentIndices[parent];
      }
    }
  }

  if (dataview.tree.includeDescendantsOfMatch) {
    const visited = new Uint8Array(rows.length);

    for (let index = 0; index < rows.length; index++) {
      if (matched[index] !== 1) {
        continue;
      }

      const stack = [...childrenByParent[index]];
      while (stack.length > 0) {
        const current = stack.pop();
        if (current == null || visited[current] === 1) {
          continue;
        }

        visited[current] = 1;
        include[current] = 1;
        stack.push(...childrenByParent[current]);
      }
    }
  }

  const expandedIdSet =
    dataview.tree.expandedIds.length > 0
      ? new Set(dataview.tree.expandedIds)
      : null;

  const selectedIdSet =
    dataview.meta.selectedRowIds.length > 0
      ? new Set(dataview.meta.selectedRowIds)
      : null;

  const isExpanded = (index: number): boolean => {
    if (expandedIdSet == null) {
      return true;
    }

    return expandedIdSet.has(idValues[index]);
  };

  const visitOrder: number[] = [];
  const metaByIndex = new Map<number, TreeRowMeta>();
  const visited = new Uint8Array(rows.length);

  const visit = (index: number, depth: number): void => {
    if (visited[index] === 1) {
      return;
    }

    visited[index] = 1;

    if (include[index] === 1) {
      visitOrder.push(index);
      const hasChildren = childrenByParent[index].length > 0;
      const isExpandedNode = hasChildren && isExpanded(index);
      metaByIndex.set(index, {
        depth,
        hasChildren,
        isExpanded: isExpandedNode,
        isMatch: matched[index] === 1,
        isSelected: selectedIdSet?.has(idValues[index]) ?? false,
        parentId: (parentValues[index] ?? null) as DataviewJsonValue | null,
      });
    }

    if (dataview.tree.maxDepth != null && depth >= dataview.tree.maxDepth) {
      return;
    }

    if (!isExpanded(index)) {
      return;
    }

    for (const child of childrenByParent[index]) {
      visit(child, depth + 1);
    }
  };

  const startNodes = rootIndices.length > 0 ? rootIndices : rows.map((_, index) => index);
  for (const root of startNodes) {
    visit(root, 0);
  }

  const flattenedWithMeta = visitOrder.map((index) => ({
    row: rows[index],
    meta: metaByIndex.get(index) ?? {
      depth: 0,
      hasChildren: false,
      isExpanded: false,
      isMatch: matched[index] === 1,
      isSelected: selectedIdSet?.has(idValues[index]) ?? false,
      parentId: (parentValues[index] ?? null) as DataviewJsonValue | null,
    },
  }));

  if (!dataview.pageSize) {
    return flattenedWithMeta;
  }

  const offset = dataview.page * dataview.pageSize;
  return flattenedWithMeta.slice(offset, offset + dataview.pageSize);
};
