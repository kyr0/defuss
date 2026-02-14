import type {
  DataviewEntry,
  DataviewFilter,
  DataviewFilterOperator,
  DataviewJsonValue,
  DataviewMeta,
  DataviewRequest,
  DataviewRow,
  DataviewSortDirection,
  DataviewSorter,
  DataviewState,
  DataviewTreeOptions,
  DataviewRowMeta,
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
    return left ? 1 : -1;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  const leftString = String(left);
  const rightString = String(right);
  return leftString.localeCompare(rightString);
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

  if (filter.op === "in" && Array.isArray(filter.value) && filter.value.length > 16) {
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

const compileSorter = (sorter: DataviewState["sorters"][number]): CompiledSorter => ({
  getValue: compileAccessor(sorter.field),
  direction: sorter.direction,
});

const normalizeFilters = (filters: DataviewRequest["filters"]): DataviewState["filters"] => {
  if (!filters) {
    return [];
  }

  return filters.map((filter) => {
    if (!filter?.field || typeof filter.field !== "string") {
      throw new Error("Dataview filter field must be a non-empty string.");
    }

    if (!FILTER_OPERATORS.includes(filter.op)) {
      throw new Error(`Dataview filter op '${String(filter.op)}' is not supported.`);
    }

    return {
      field: filter.field,
      op: filter.op,
      value: filter.value,
    };
  });
};

const normalizeSorters = (sorters: DataviewRequest["sorters"]): DataviewState["sorters"] => {
  if (!sorters) {
    return [];
  }

  return sorters.map((sorter: DataviewSorter) => {
    if (!sorter?.field || typeof sorter.field !== "string") {
      throw new Error("Dataview sorter field must be a non-empty string.");
    }

    const direction = (sorter.direction ?? sorter.dir ?? "asc").toLowerCase() as DataviewSortDirection;

    if (!SORT_DIRECTIONS.includes(direction)) {
      throw new Error(
        `Dataview sorter direction '${String(sorter.direction ?? sorter.dir)}' is not supported.`,
      );
    }

    return {
      field: sorter.field,
      direction,
    };
  });
};

const normalizePaging = (request: DataviewRequest): Pick<DataviewState, "page" | "pageSize"> => {
  const page = request.page ?? 0;
  const pageSize = request.pageSize;

  if (!Number.isInteger(page) || page < 0) {
    throw new Error("Dataview page must be an integer >= 0.");
  }

  if (pageSize != null) {
    if (!Number.isInteger(pageSize) || pageSize <= 0) {
      throw new Error("Dataview pageSize must be an integer > 0.");
    }
  }

  return { page, pageSize };
};

const uniqueJsonValues = (values: unknown[]): DataviewMeta["selectedRowIds"] => {
  const seen = new Set<string>();
  const result: DataviewMeta["selectedRowIds"] = [];

  for (const value of values) {
    const key = JSON.stringify(value);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value as DataviewMeta["selectedRowIds"][number]);
  }

  return result;
};

const normalizeMeta = (request: DataviewRequest): DataviewMeta => {
  const selectedRowIds = Array.isArray(request.meta?.selectedRowIds)
    ? uniqueJsonValues(request.meta.selectedRowIds)
    : [];

  const lockedColumns = Array.isArray(request.meta?.lockedColumns)
    ? Array.from(
        new Set(
          request.meta.lockedColumns.filter(
            (column): column is string => typeof column === "string" && column.length > 0,
          ),
        ),
      )
    : [];

  return {
    selectedRowIds,
    lockedColumns,
  };
};

const normalizeTree = (tree: DataviewTreeOptions | undefined): DataviewState["tree"] => {
  if (!tree) {
    return undefined;
  }

  if (!tree.idField || typeof tree.idField !== "string") {
    throw new Error("Dataview tree idField must be a non-empty string.");
  }

  if (!tree.parentIdField || typeof tree.parentIdField !== "string") {
    throw new Error("Dataview tree parentIdField must be a non-empty string.");
  }

  if (tree.maxDepth != null) {
    if (!Number.isInteger(tree.maxDepth) || tree.maxDepth < 0) {
      throw new Error("Dataview tree maxDepth must be an integer >= 0.");
    }
  }

  return {
    idField: tree.idField,
    parentIdField: tree.parentIdField,
    expandedIds: tree.expandedIds ?? [],
    maxDepth: tree.maxDepth,
    includeAncestors: tree.includeAncestors ?? true,
    includeDescendantsOfMatch: tree.includeDescendantsOfMatch ?? false,
  };
};

export const createDataview = (request: DataviewRequest = {}): DataviewState => {
  const filters = normalizeFilters(request.filters);
  const sorters = normalizeSorters(request.sorters);
  const paging = normalizePaging(request);
  const meta = normalizeMeta(request);
  const tree = normalizeTree(request.tree);

  return {
    filters,
    sorters,
    page: paging.page,
    pageSize: paging.pageSize,
    meta,
    tree,
  };
};

const paginate = <T>(rows: T[], dataview: DataviewState): T[] => {
  if (!dataview.pageSize) {
    return rows;
  }

  const offset = dataview.page * dataview.pageSize;
  return rows.slice(offset, offset + dataview.pageSize);
};

const applyFlatDataview = <T extends DataviewRow>(
  rows: T[],
  dataview: DataviewState,
): Array<DataviewEntry<T>> => {
  const compiledFilters = dataview.filters.map(compileFilter);
  const compiledSorters = dataview.sorters.map(compileSorter);

  const filteredRows = compiledFilters.length
    ? rows.filter((row) => {
        for (const filter of compiledFilters) {
          if (!filter.test(filter.getValue(row))) {
            return false;
          }
        }

        return true;
      })
    : rows;

  const sortedRows = compiledSorters.length
    ? [...filteredRows].sort((left, right) => {
        for (const sorter of compiledSorters) {
          const comparison = compareWithDirection(
            sorter.getValue(left),
            sorter.getValue(right),
            sorter.direction,
          );

          if (comparison !== 0) {
            return comparison;
          }
        }

        return 0;
      })
    : filteredRows;

  const selectedIdSet =
    dataview.meta.selectedRowIds.length > 0
      ? new Set(dataview.meta.selectedRowIds)
      : null;

  return paginate(sortedRows, dataview).map((row) => {
    const rowId = isObject(row) ? (row.id as DataviewJsonValue) : undefined;

    return {
      row,
      meta: {
        depth: 0,
        hasChildren: false,
        isExpanded: false,
        isMatch: true,
        isSelected: rowId != null ? (selectedIdSet?.has(rowId) ?? false) : false,
        parentId: null,
      },
    };
  });
};

const makeTreeComparator = <T extends DataviewRow>(
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

const applyTreeDataview = <T extends DataviewRow>(
  rows: T[],
  dataview: DataviewState,
): Array<DataviewEntry<T>> => {
  if (!dataview.tree || rows.length === 0) {
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

    const parentIndex = mappedParent == null || mappedParent === index ? -1 : mappedParent;

    parentIndices[index] = parentIndex;

    if (parentIndex === -1) {
      rootIndices.push(index);
    } else {
      childrenByParent[parentIndex].push(index);
    }
  }

  const compiledSorters = dataview.sorters.map(compileSorter);
  const comparator = makeTreeComparator(rows, compiledSorters);

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
    const visitedDescendants = new Uint8Array(rows.length);

    for (let index = 0; index < rows.length; index++) {
      if (matched[index] !== 1) {
        continue;
      }

      const stack = [...childrenByParent[index]];
      while (stack.length > 0) {
        const current = stack.pop();
        if (current == null || visitedDescendants[current] === 1) {
          continue;
        }

        visitedDescendants[current] = 1;
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
  const metaByIndex = new Map<number, DataviewRowMeta>();
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

    if (dataview.tree?.maxDepth != null && depth >= dataview.tree.maxDepth) {
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
    meta: metaByIndex.get(index)!,
  }));

  return paginate(flattenedWithMeta, dataview);
};

export const applyDataview = <T extends DataviewRow>(
  rows: T[],
  dataview: DataviewState,
): Array<DataviewEntry<T>> => {
  if (dataview.tree) {
    return applyTreeDataview(rows, dataview);
  }

  return applyFlatDataview(rows, dataview);
};
