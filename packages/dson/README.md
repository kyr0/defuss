<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss</code>
</p>

<sup align="center">

*D*efinitely-typed *S*erialized *O*bject *N*otation (DSON)

</sup>

</h1>


> `defuss-dson` serializes JavaScript-datastructures into JSON while preserving metadata about their original types. It is a superset of JSON, meaning that any valid JSON is also valid DSON. However, with DSON, if you're serializing a `Map`, `Set`, `Date`, `RegExp` or custom class, 
you'll get the same protoype-backed representation in return when  deserialized. The API is compatible to JSON: `const object = DSON.parse(serializedDson)`, `const serializedDson = JSON.stringify(object)`.

<h3 align="center">

Supported datatypes

</h3>

- `RegExp`
- `Date`
- `Symbol`
- `Map`
- `Set`
- `ArrayBuffer` (any typed array)
- `DataView`
- 


<h3 align="center">

Integrating `defuss-dson` in an existing defuss project

</h3>

TODO:

**🚀 Looking for a template to start from?** `examples/notebooks` is an Astro project pre-configured to work with `defuss-db` out-of-the-box.

#### 2. Integrate `defuss-db`:

Just import `Table` from `defuss-db` and use it in your project:

```ts
import { Table } from 'defuss-db';
```

A table needs a database storage provider:

In-browser (client-side/frontend) use-case:

```ts
import { DexieProvider } from "defuss-db";
```

Using the database is as easy as wiring them up:

```ts
// define a model
interface User {
  name: string;
  age: number;
  email: string;
}

const dexieProvider = new DexieProvider(TEST_DB_NAME);
await dexieProvider.connect(); // connects to the database

const myTable = new DefussTable<User>(provider, "my-table");
await myTable.init(); // runs a schema update
```


#### 3. Use the API of `defuss-db`:

To interact with the table, create, read, update, and delete records:

```ts
const user: User = {
  name: "Alice",
  age: 30,
  email: "alice@example.com",
};

// in defuss-db, indices are added explicitly, this allows for indices to diverge from the underlying from the data stored. This separation solves a common issue with performance in speed and size dimensions.
const indexData = { email: user.email }; // data to find the user by later-on

// returns the primary key of the inserted user
const pk = await table.insert(/* data */ user, /* indices */ indexData);

// find a specific user
const user = await table.findOne(/* indices */ { email: "alice@example.com" });

// find many users of a specific TLD
const users = await table.find(/* indices */ { email: "*@example.com" });

// updates the user
await table.update(/* update indices */ { email: user.email }, /* paertial data */ { age: 29 });

// deletes the user
await table.delete(/* indices */ { email: user.email });
```

Due to the nature of `defuss-db`, bridging the gap beween different database architectures and even between frontend and backend, the API cannot feature all the specific functionality of each underlaying provider. It is designed to simply provide the intersection feature-set. There are no foreign keys, no transactions, no joins, and no complex queries. You are supposed to design your data model in a semi-normalized way and use smart indices and data access patterns to get the most out of this.

<h3 align="center">

🚀 How does `defuss-db` work?

</h3>

Inside this package, you'll find the following relevant folders and files:

```text
/
├── provider/dexie.ts
├── provider/libsql.ts
├── provider/mongodb.ts
├── src/index.ts
├── src/types.ts
├── src/env.ts
├── src/table.ts
├── src/client.ts
├── src/server.ts
├── tsconfig.json
├── LICENSE
├── package.json
```

The `src/index.ts` file is the "entry point" for general and type imports, while `server.ts` and `client.ts` are the respective imports to use whenever a specific runtime environment implement is desired to be used. The `defuss-db/client` and `defuss-db/server` imports will resolve to these files automatically.

You'll find each specific provider implementation in the `provider` folder.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command       | Action                                                                                                                                                                                                                           |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm build`    | Build a new version of the integration. |
| `npm mongodb:start`    | Start the MongoDB server (requires Docker). |
| `npm mongodb:stop`    | Stop the MongoDB server (requires Docker). |
| `npm test:integration`    | Run the integration tests for the `defuss-db` package. |

---

<img src="assets/defuss_comic.png" />

<caption><i><b>Come visit us on defuss island!</b></i></caption>