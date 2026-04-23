<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss-db</code>
</p>

<sup align="center">

Database Abstraction 2.0

</sup>

</h1>

> `defuss-db` 2.0 is a schema-driven database abstraction for `defuss`. You declare a table once, define the fields you want indexed, and then use one CRUD API across Dexie, LibSQL, MongoDB, and JSONL.

## What Changed In 2.0

- `id` is now the only public identity field.
- `pk` is gone.
- `_index` fields are gone.
- Per-call `indexData` arguments are gone.
- Tables now declare indexes once with `defineTable()`.
- `upsert()` is now selector-first: `upsert(selector, value)`.
- A new server-side JSONL provider is included.

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

- `defuss-db` exports shared types, `defineTable()`, and `DefussTable`.
- `defuss-db/client.js` exports `DexieProvider`.
- `defuss-db/server.js` exports `LibsqlProvider`, `MongoProvider`, and `JsonlProvider`.

## Commands

All commands below are run from `packages/db`.

| Command | Action |
| :-- | :-- |
| `bun run build` | Build the package |
| `bun run mongodb:start` | Start the MongoDB test container |
| `bun run mongodb:stop` | Stop the MongoDB test container |
| `bun run test` | Run the package test suite |

## Notes

`defuss-db` intentionally stays small. There are still no joins, transactions, foreign keys, or provider-specific query DSLs. The package is designed around a portable subset: declared indexes, selectors over stored values, and predictable cross-provider behavior.