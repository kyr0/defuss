<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss-db</code>
</p>

<sup align="center">

Isomorphic Multi-Backend Database Abstraction for Web and Node.js

</sup>

</h1>

> `defuss-db` is a schema-driven database abstraction for `defuss`. You declare a table once, define the fields you want indexed, and then use one CRUD API across all supported providers.

## Supported Providers

- `DexieProvider` for browser IndexedDB.
- `LibsqlProvider` for SQLite/libSQL.
- `MongoProvider` for MongoDB.
- `JsonlProvider` for simple file-backed server-side storage.

## Core Idea

Declare a table once and then query real value fields.

```ts
import { DefussTable, defineTable, type DefussRecord } from "defuss-db";
import { DexieProvider } from "defuss-db/client.js";

interface User extends DefussRecord {
  name: string;
  email: string;
  age: number;
  profile: {
    city: string;
  };
}

const userTable = defineTable<User>({
  name: "users",
  indexes: [
    {
      name: "email",
      source: "email",
      unique: true,
    },
    {
      name: "city",
      source: "profile.city",
    },
  ],
});

const provider = new DexieProvider("AppDatabase");
await provider.connect();

const users = new DefussTable(provider, userTable);
await users.init();
```

## CRUD API

```ts
const id = await users.insert({
  name: "Alice",
  email: "alice@example.com",
  age: 30,
  profile: {
    city: "Berlin",
  },
});

const byEmail = await users.findOne({ email: "alice@example.com" });
const byCity = await users.find({ "profile.city": "Berlin" });

await users.update({ id }, { age: 31 });
await users.delete({ id });

const upsertedId = await users.upsert(
  { email: "alice@example.com" },
  {
    name: "Alice",
    email: "alice@example.com",
    age: 32,
    profile: {
      city: "Berlin",
    },
  },
);
```

## Aggregation API

For read-heavy flows that need joins, projections, grouping, or sorting, use the provider-agnostic aggregation builder. It sits above `find()` so providers stay small while higher-level read pipelines remain portable.

You can start from a table:

```ts
const result = await users
  .aggregate()
  .project({
    userId: "base.id",
    email: "base.email",
  })
  .execute();
```

Or compose multiple sources directly:

```ts
import {
  avgBy,
  countRows,
  createAggregation,
  sumBy,
} from "defuss-db";

const summary = await createAggregation({ table: orders, as: "orders" })
  .join(
    { table: users, as: "users" },
    { type: "left", left: "orders.customerId", right: "id" },
  )
  .alias({
    customerName: "users.name",
  })
  .groupBy(
    {
      customerId: "orders.customerId",
      customerName: "customerName",
    },
    {
      orderCount: countRows(),
      revenue: sumBy("orders.total"),
      averageOrderValue: avgBy("orders.total"),
    },
  )
  .sortBy({ field: "revenue", direction: "desc" })
  .execute();
```

Available pipeline steps:

- `join()` supports `left`, `right`, and `inner` joins over table-backed or array-backed sources.
- `project()` reshapes rows into a new object.
- `alias()` adds derived fields while keeping the existing row.
- `compute()` and `computeMany()` append derived fields.
- `mapRows()` applies a custom row mapper.
- `removeFields()` removes one or more nested paths from each row.
- `mergeConsecutive()` merges adjacent rows after an explicit sort.
- `distinctBy()` keeps the first or last row for a computed key.
- `groupBy()` returns one row per group key with reducer outputs.
- `sortBy()` accepts field specs, resolver specs, or a custom comparator.

Reducer helpers exported from `defuss-db`:

- `countRows()`
- `sumBy()`
- `avgBy()`
- `minBy()`
- `maxBy()`
- `firstBy()`
- `lastBy()`

Notes:

- The base table alias defaults to `base`, or you can override it with `aggregate({ as: "users" })`.
- Source-level `where` selectors run before aggregation, so joins and grouping operate on filtered provider results.
- Join `left` paths are resolved against the current aggregated row, while `right` paths are resolved against the joined source row.

## Selector Rules

- `find()`, `findOne()`, `update()`, and `delete()` accept selectors over real stored fields.
- If a selector field is indexed, the provider uses that index.
- If a selector field is not indexed, providers may fall back to a scan.
- `upsert()` is stricter: the selector must be non-empty and must target `id` or a declared unique index.

## `id` Semantics

- `id` is always the public primary key.
- `id` is always implicitly indexed.
- MongoDB maps `id` to `_id`.
- LibSQL stores `id` as the primary key column.
- JSONL stores `id` as the row identity in memory and on disk.
- Dexie uses `id` as the table primary key field.

## Nested And Derived Indexes

Use a path for nested values:

```ts
const table = defineTable({
  name: "profiles",
  indexes: [
    { name: "city", source: "profile.city" },
  ],
});
```

Use a mapping function for derived indexes:

```ts
const table = defineTable({
  name: "users",
  indexes: [
    {
      name: "emailDomain",
      source: (value) => value.email.split("@")[1] ?? null,
    },
  ],
});
```

## JSONL Provider

The JSONL provider is exported from the server entry only.

```ts
import { DefussTable, defineTable } from "defuss-db";
import { JsonlProvider } from "defuss-db/server.js";

const provider = new JsonlProvider();
await provider.connect({
  baseDir: "./.data",
});
```

Behavior:

- One `.jsonl` file per table.
- Insert appends a new line.
- Update and delete rewrite the table file.
- All rows are loaded into memory on connect.

This provider is intended for prototyping, debugging, fixtures, and small local datasets.

## Runtime Entrypoints

- `defuss-db` exports shared types, `defineTable()`, `DefussTable`, `createAggregation()`, and aggregation reducer helpers.
- `defuss-db/client.js` exports `DexieProvider`.
- `defuss-db/server.js` exports `LibsqlProvider`, `MongoProvider`, and `JsonlProvider`.

## Commands

All commands below are run from `packages/db`.

| Command | Action |
| :-- | :-- |
| `bun run build` | Build the package |
| `bun run example:dexie` | Run the Dexie / IndexedDB walkthrough |
| `bun run example:libsql` | Run the LibSQL walkthrough |
| `bun run example:jsonl` | Run the JSONL walkthrough |
| `bun run example:mongodb` | Run the MongoDB walkthrough |
| `bun run example:all` | Run all provider walkthroughs sequentially |
| `bun run mongodb:start` | Start the MongoDB test container |
| `bun run mongodb:stop` | Stop the MongoDB test container |
| `bun run test` | Runs the package test suite including all examples |

## Architectural Decisions

`defuss-db` intentionally keeps the provider contract small. CRUD, declared indexes, selectors over stored values, and predictable cross-provider behavior remain the core. Transactions, foreign keys, and provider-specific query DSLs are out of scope. Portable joins, grouping, sorting, and reshaping live in the separate aggregation builder above `find()` instead of expanding provider complexity.
