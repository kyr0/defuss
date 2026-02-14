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

`defuss-dataview` provides a tiny procedural API to define and apply an ADSD (Abstract Data State Description) for filtering, sorting, paging, and UI meta state.

- JSON-first descriptor (`filters`, `sorters`, `page`, `pageSize`, `meta`)
- Zero-based paging (`page: 0` is the first page)
- Dot-path field access (for example `user.profile.city`)
- Immutable state updates for selection, locked columns, and tree expansion

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

const visibleRows = applyDataview(rows, view);
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

```ts
import {
  createDataview,
  setSelectedRows,
  toggleSelectedRow,
  setLockedColumns,
} from "defuss-dataview";

let view = createDataview({ sorters: [{ field: "id", direction: "asc" }] });

view = setSelectedRows(view, [1, 2, 3] /* id */);
view = toggleSelectedRow(view, 2) /* id */;
view = setLockedColumns(view, ["id", "name"]);
```

<h3 align="center">
Tree API
</h3>

For tree grids, use the `createTreeDataview` and `applyTreeDataview` functions. The tree view supports expanded/collapsed state, multi selection, and provides additional meta info such as depth and whether a row has children.

```ts
import {
  createTreeDataview,
  applyTreeDataview,
  applyTreeDataviewWithMeta,
  toggleExpanded,
  setSelectedRows,
} from "defuss-dataview";

let treeView = createTreeDataview({
  tree: {
    idField: "id",
    parentIdField: "parentId",
    expandedIds: [1],
    includeAncestors: true,
    includeDescendantsOfMatch: false,
  },
  sorters: [{ field: "id", direction: "asc" }],
});

treeView = toggleExpanded(treeView, 2 /* id */);
treeView = setSelectedRows(treeView, [4, 7], /* ids */);

const rows = applyTreeDataview(data, treeView);
const entries = applyTreeDataviewWithMeta(data, treeView);
// entries: [{ row, meta: { depth, hasChildren, isExpanded, isMatch, parentId, isSelected } }]
```

<h3 align="center">
API Reference
</h3>

### Core
- `createDataview(request)`
- `applyDataview(data, view)`
- `Dataview.createDataview(request)`
- `Dataview.applyDataview(data, view)`

### Grid Meta Helpers
- `patchMeta(view, patch)`
- `setSelectedRows(view, ids)`
- `toggleSelectedRow(view, id)`
- `setLockedColumns(view, columns)`

### Tree (Experimental)
- `createTreeDataview(request)`
- `applyTreeDataview(data, view)`
- `applyTreeDataviewWithMeta(data, view)`
- `setExpandedIds(view, ids)`
- `toggleExpanded(view, id)`

<h3 align="center">
Benchmark (non-gating)
</h3>

Run a lightweight benchmark for 10k/50k regression tracking:

```bash
pnpm --filter defuss-dataview benchmark
```

<p align="center">

  <img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" width="400px" />

</p>

<p align="center">
  <i><b>Come visit us on <code>defuss</code>