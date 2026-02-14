<h1 align="center">

<img src="https://github.com/kyr0/defuss/blob/main/assets/defuss_mascott.png?raw=true" width="100px" />

<p align="center">
  
  <code>defuss-dataview</code>

</p>

<sup align="center">

Isomorphic functional data view (filters, sorters, paging, meta UI state) for table and tree grids.

</sup>

</h1>

<h3 align="center">
Overview
</h3>

`defuss-dataview` provides a tiny procedural API to define and apply an ADSD (Abstract Data State Description) for filtering, sorting, paging, and UI state.

- JSON-first descriptor (`filters`, `sorters`, `page`, `pageSize`, `meta`, optional `tree`)
- Sorters accept `direction` and alias `dir`
- Zero-based paging (`page: 0` is the first page)
- Dot-path field access (for example `user.profile.city`)
- Single apply contract: always returns `[{ row, meta }]`

<h3 align="center">
Installation
</h3>

```bash
npm install defuss-dataview
```

<h3 align="center">
Basic Usage
</h3>

```ts
import { createDataview, applyDataview } from "defuss-dataview";

const view = createDataview({
  filters: [
    { field: "a", op: "eq", value: "Foo" },
    { field: "b", op: "eq", value: "Bar" },
  ],
  sorters: [
    { field: "a", direction: "desc" },
    { field: "id", direction: "asc" },
  ],
  page: 0,
  pageSize: 20,
});

const rows = [
  { id: 2, a: "Foo", b: "Bar" },
  { id: 1, a: "Foo", b: "Bar" },
  { id: 3, a: "Foo", b: "Baz" },
];

const entries = applyDataview(rows, view);

// [{ row, meta }]
// entries[0].row
// entries[0].meta
```

`applyDataview` never mutates the input array, so repeated apply calls on the same backing data are safe.

<h3 align="center">
Supported Filter Operators
</h3>

- `eq`
- `neq`
- `gt`
- `gte`
- `lt`
- `lte`
- `in`
- `contains`
- `startsWith`
- `endsWith`

<h3 align="center">
UI Meta State Helpers
</h3>

Persist UI interactions (single/multi selection, locked columns, expand/collapse) in `view.meta`:

These helpers work for both flat tables and tree views.

```ts
import {
  createDataview,
  setSelectedRows,
  toggleSelectedRow,
  setLockedColumns,
} from "defuss-dataview";

let view = createDataview({ sorters: [{ field: "id", direction: "asc" }] });

view = setSelectedRows(view, [1, 2, 3]);
view = toggleSelectedRow(view, 2);
view = setLockedColumns(view, ["id", "name"]);
```

Use `updateMeta` when you want to update **UI-only interaction state** without touching filters/sorters/paging:

```ts
import { updateMeta } from "defuss-dataview";

view = updateMeta(view, {
  selectedRowIds: [1, 2, 3],
  lockedColumns: ["id", "name"],
});
```

`updateMeta` is ideal for:

- row selection (`selectedRowIds`)
- locked/frozen columns (`lockedColumns`)
- combining multiple UI-meta updates in one state transition

For query-state changes like filtering, sorting, or pagination, use `createDataview` (not `updateMeta`).

<h3 align="center">
UI Integration Pattern
</h3>

Treat `view` as a controlled UI state object and re-apply on every interaction.

```ts
import {
  applyDataview,
  createDataview,
  updateMeta,
  toggleExpanded,
  toggleSelectedRow,
} from "defuss-dataview";

let view = createDataview({
  page: 0,
  pageSize: 25,
  sorters: [{ field: "id", dir: "asc" }],
  tree: {
    idField: "id",
    parentIdField: "parentId",
    expandedIds: [],
  },
});

const updateView = (next: typeof view) => {
  view = next;
  const entries = applyDataview(rows, view);
  render(entries); // your defuss/React/Vue/Svelte/DOM renderer
};

// select one row
const onRowClick = (id: number) => updateView(toggleSelectedRow(view, id));

// select all visible rows
const onSelectAllVisible = () => {
  const entries = applyDataview(rows, view);
  const ids = entries.map((entry) => entry.row.id as number);
  updateView(updateMeta(view, { selectedRowIds: ids }));
};

// collapse/expand one node
const onToggleNode = (id: number) => updateView(toggleExpanded(view, id));

// sort ("reorder")
const onSortChange = (field: string, direction: "asc" | "desc") =>
  updateView(
    createDataview({
      ...view,
      sorters: [{ field, direction }],
      page: 0,
    }),
  );

// filtering
const onFilterChange = (search: string) =>
  updateView(
    createDataview({
      ...view,
      filters: search
        ? [{ field: "title", op: "contains", value: search }]
        : [],
      page: 0,
    }),
  );

// pagination
const onPageChange = (page: number) =>
  updateView(
    createDataview({
      ...view,
      page,
    }),
  );
```

Rule of thumb:

- `updateMeta` / selection / expansion helpers: interactive UI state
- `createDataview`: structural query state (`filters`, `sorters`, `page`, `pageSize`, `tree`)

<h3 align="center">
Patching Data (Batch Update/Insert/Remove/Move)
</h3>

`defuss-dataview` now includes immutable data update helpers for UI-driven row changes:

- `updateRows(rows, ids, updates, idField?)`
- `addRows(rows, newRows, anchorId?, position?, idField?)`
- `removeRows(rows, ids, idField?)`
- `setParent(rows, nodeId, parentId, idField?, parentIdField?)`

After patching data, call `applyDataview(data, view)` again to re-compute visible entries and row meta.

```ts
import {
  applyDataview,
  addRows,
  setParent,
  updateRows,
  removeRows,
} from "defuss-dataview";

// table update (batch)
data = updateRows(
  data,
  [1, 3],
  [{ score: 99 }, { title: "Updated title" }],
);

// table insert: add row after id=3 (default position is "after")
data = addRows(data, [{ id: 8, title: "Inserted" }], 3);

// table remove
data = removeRows(data, [5, 9]);

// tree move: move node 8 under parent 2
data = setParent(data, 8, 2);

const entries = applyDataview(data, view);
render(entries);
```

Tree example (remove one node and its known subtree ids):

```ts
import { applyDataview, removeRows } from "defuss-dataview";

// remove node 7 and descendants 11 + 12
data = removeRows(data, [7, 11, 12]);

const entries = applyDataview(data, view);
render(entries);
```

Tree example (update one node in place):

```ts
import { applyDataview, updateRows } from "defuss-dataview";

data = updateRows(data, [7], [{ title: "Renamed node" }]);

const entries = applyDataview(data, view);
render(entries);
```

<h3 align="center">
Tree API
</h3>

Tree behavior is enabled by adding `tree` options to `createDataview`. `applyDataview` still remains the only apply function.

```ts
import {
  createDataview,
  applyDataview,
  toggleExpanded,
  setSelectedRows,
} from "defuss-dataview";

let view = createDataview({
  tree: {
    idField: "id",
    parentIdField: "parentId",
    expandedIds: [1],
    includeAncestors: true,
    includeDescendantsOfMatch: false,
  },
  sorters: [{ field: "id", direction: "asc" }],
});

view = toggleExpanded(view, 2);
view = setSelectedRows(view, [4, 7]);

const entries = applyDataview(data, view);
// entries: [{ row, meta: { depth, hasChildren, isExpanded, isMatch, parentId, isSelected } }]
```

<h3 align="center">
API Reference
</h3>

### Core
- `createDataview(request)`
- `applyDataview(data, view)`
- `updateRows(rows, ids, updates, idField?)`
- `addRows(rows, newRows, anchorId?, position?, idField?)`
- `removeRows(rows, ids, idField?)`
- `setParent(rows, nodeId, parentId, idField?, parentIdField?)`

### Grid & Tree Meta Helpers
- `updateMeta(view, updates)`
- `setSelectedRows(view, ids)`
- `toggleSelectedRow(view, id)`
- `setLockedColumns(view, columns)`

### Tree-only Helpers
- `setExpandedIds(view, ids)`
- `toggleExpanded(view, id)`

<h3 align="center">
Benchmark (non-gating)
</h3>

Run a lightweight benchmark for 10k / 50k / 1M rows and advanced usage patterns (interaction loops, data update/add/remove flows, and tree apply scenarios):

```bash
pnpm --filter defuss-dataview benchmark
```

<p align="center">

  <img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" width="400px" />

</p>

<p align="center">
  <i><b>Come visit us on <code>defuss</code>