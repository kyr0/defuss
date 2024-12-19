# Cache Architecture

A cache is a system component that is meant to store temporarly.
This is useful for optimization (e.g. to query the database less frequently)
or when data isn't practical to share between different parts of an app.

Because of it's short-lived nature and primary use-case, any Cache API should
focus on a simple, Hashmap-like data-structure (e.g. plain key-value objects)
to make it easy to invalidate data (=> remove or reset temporary values).

It is also important for a modern Cache implementation to support multiple
data storage backends, because every project has different requirements. 

In modern web development, data must be cached both on the server 
(edge, cloud, on premise, bare metal, embedded/IoT) and in the client 
(browser, native JS runtime embedded). Thus, a modern cache implementation
should be isomorphic: A developer should be able to use it in the very same
way on the server as well as on the client-side.

In consequence, state can happen to be _fragmented_ between server and client.
When a database driver-backed Cache API is used on the client-side, but there
is technically no way for the client to communicate with the database directly,
a modern Cache layer should automatically back the developer by integrating
_automatic state synchronization_. Such state synchronization should be non-blocking:
When a write operation occurs, the synchronization should happen asynchronous in
the background. When a read operation happens, only the latest state is read.

This pattern allows for such Cache API to be implemented _quasi-asynchronous_.
It's API is synchronous and non-blocking while it's synchronization and storage
algorithms are running asynchronously in prallel. This architecture yields 
extreme performance and should be the default. Optionally, any system can
also use the asynchonous API variant, which will await operations to be completed.

Data consistency is another major concern in caching systems. Therefore, all write operations
must be ordered (the current write operation blocks a later write operation).

Asynchronous state synchronization in distributed systems must implement 
retry-mechanisms for cache data storage backends can become unavailable at times. 
However, maximum retry and maximum wait time per retry need to be configurable
and act as circuit breaker logic.

Lastly, we live in a collaborative world. It is very likely for people to work
collaboratively. While this is a cache storage problem (the data that is shared 
between peers is likely to be cached), it isn't the right place to implement
CRDT synchronization logic directly in a Cache API, as any system should be designed
as simple as possible, but not simpler, and must use-cases do not rely on CRDT logic.