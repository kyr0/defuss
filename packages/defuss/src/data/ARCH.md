# Data Architecture

Data is stored and received with different intentions.

A) Local state synchronization (STATE, `defuss/store`): Data in the frontend that is shared between components
is not persisted, but should be evicted. However, 
data structures need to be efficient in querying and syncing,
notifying other components on change. Every `Ref` in defuss comes with its own store for state synchronization
between components.

B) Semi-persistent state (CACHE, `defuss/webstorage`): Data in the frontend can also be in a semi-persistent state,
where it should be restored after a reload of the webpage
until the state is invalidated or the client changes. This kind of data counts as eventually-existent cache.
Webstorage data must be stored locally, in-browser and is thus, user-specific. 
If such user-specific data is cached on the server while SSR isomporphic execution, 
it should be stored in-memory only and forgotten after the request has been processed on the server.
Possible backends for a cache might be a browsers `sessionStorage` or `localStorage`.
However, because browsers not always guarantee WebStroage to be available (e.g. private mode)
and the same API is not available on server-side, a thin layer of abstraction (like `defuss/webstroage`) is needed.

C) Persistent state (DATABASE, `defuss-db`): Data that is considered to be user data, often needs to be 
stored in a persistent manner. It should never be deleted until
the user explicitly asks for it. Possible backends, suitabel for most needs include `IndexedDB` 
for local, in-browser databases, and `SQLite` (either stored in a file on disk, or remotely, connected over network via `libSQL`). Other drivers for SQL- and NoSQL storage backends are planned for the future.

`defuss-db` also comes with a simple abstraction that offers pre-defined table layouts such as `Cache`.
This allows `defuss-db` to be used for persistent caching of data in a key-value manner.

`defuss-db` also supports `Blob`-storage, simplifying user-data file-storage.