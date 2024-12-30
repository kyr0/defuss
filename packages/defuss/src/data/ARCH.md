# Data Architecture

Data is stored and received with different intentions.

A) Local state synchronization (STATE, `defuss-store`): Data in the frontend that is shared between components
is not persisted, but should be evicted. However, 
data structures need to be efficient in querying and syncing,
notifying other components on change.

B) Semi-persistent state (CACHE, `defuss-cache`): Data in the frontend can also be in a semi-persistent state,
where it should be restored after a reload of the webpage
until the state is invalidated. This kind of data counts as cache.
Cache data must be stored locally and user-specific. 
If user-specific data is cached on the server (e.g. in case of SSR, isoporphic execution), 
it should be stored in-memory only for security reasons).
Possible backends for a cache might be a browsers `sessionStorage` or `localStorage`.

C) Persistent state (DATABASE, `defuss-db`): Data that is considered to be user data, often needs to be 
stored in a persistent manner. It should never be deleted until
the user explicitly asks for it. Possible backends, suitabel for most needs include `IndexedDB` 
for local, in-browser databases, and `SQLite` (either stored in a file on disk, or remotely, connected over network via `libSQL`). There are many other options such as NoSQL and other relational databases,
however, they all come with a complexity that isn't necessary for most use-cases.