import type {
  DataviewMeta,
  DataviewFilter,
  DataviewFilterOperator,
  DataviewRequest,
  DataviewRow,
  DataviewSortDirection,
  DataviewSorter,
  DataviewState,
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

    const direction = (sorter.direction ?? "asc").toLowerCase() as DataviewSortDirection;

    if (!SORT_DIRECTIONS.includes(direction)) {
      throw new Error(`Dataview sorter direction '${String(sorter.direction)}' is not supported.`);
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

export const createDataview = (request: DataviewRequest = {}): DataviewState => {
  const filters = normalizeFilters(request.filters);
  const sorters = normalizeSorters(request.sorters);
  const paging = normalizePaging(request);
  const meta = normalizeMeta(request);

  return {
    filters,
    sorters,
    page: paging.page,
    pageSize: paging.pageSize,
    meta,
  };
};

export const applyDataview = <T extends DataviewRow>(rows: T[], dataview: DataviewState): T[] => {
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

  if (!dataview.pageSize) {
    return sortedRows;
  }

  const offset = dataview.page * dataview.pageSize;
  return sortedRows.slice(offset, offset + dataview.pageSize);
};
