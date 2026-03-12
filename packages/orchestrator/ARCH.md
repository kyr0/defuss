# defuss-orchestrator architecture

## Purpose

`defuss-orchestrator` is a **pull-based**, **federated**, **eventually consistent** work orchestrator.
It is not a general-purpose message broker and it is not trying to cosplay as Redis. The design target is:

- fast hot path
- minimal moving parts
- durable local recovery
- easy horizontal fanout across cores and peers
- explicit, honest semantics under partial failure

## Core model

### 1. Initial placement uses rendezvous hashing

When a client schedules a work item against any peer, the peer computes the preferred owner with rendezvous hashing over the currently live peer set.

Why:

- removes ownership broadcast chatter
- gives near-even distribution
- remaps only a small fraction of keys when membership changes

### 2. Ownership becomes sticky after accept

Once a peer accepts a work item, that peer is recorded as `ownerPeerId` in the item runtime and remains the authority until the item reaches a terminal/cleanup state.

Why:

- local durability is per peer
- there is no replicated responsibility map
- dynamic re-hashing of existing items would create nonsense during churn, because another peer may be computed as owner while not having the actual item

Consequence:

- rendezvous hashing is used for **initial placement**, not ongoing rebalancing of existing items
- a wrong peer can compute a **suggested owner** from current membership, but cannot always prove the accepted owner after churn
- clients should cache the accepted owner returned from scheduling

This is the honest contract. Anything stronger without replication would be wizard theater.

## Guarantees

### Guaranteed

- deterministic initial owner choice for a given live peer set
- at most one local owner accepted the item inside one coherent membership view
- local recovery after restart when a durable store is configured
- non-blocking hot path durability handoff (`record()` never blocks the caller)
- no orchestrator-to-worker callbacks; workers always pull
- terminal items leave active memory

### Not guaranteed

- globally linearizable status across peers
- perfect redirect knowledge from every peer at every moment
- automatic recovery/replay on owner loss
- cross-peer transactions
- exactly-once processing

## Assumptions

- peer IDs are stable UUID-like values
- peer endpoints are metadata; identity is the ID
- workers tolerate retry and duplicate-safe handling where needed
- clients can reschedule if status is unknown after owner disappearance
- membership eventually converges enough that initial placement is usually consistent

## Why pull topology

Workers ask for work. Orchestrators never push into workers.

Why:

- firewall-friendly topology
- simpler backpressure
- easier worker isolation
- workers can attach telemetry/capability metadata to each pull request
- the scheduler decides among available work at the moment of pull

## Scheduling and worker selection

The package supports two pure selection concepts:

1. `SelectWorkItemForWorkerFn`
   - input: one requesting worker + candidate items
   - output: chosen work item ID
   - this is the default engine path

2. `SelectWorkerForWorkItemFn`
   - input: one work item + worker proposals
   - output: chosen worker ID
   - utility for deployments that want to reason about worker proposals directly

The default work selection is intentionally boring:

- respect capability and payload limits first
- then rank by priority, age, retry penalty, and optional affinity hints

This keeps the engine predictable and easy to replace.

## Runtime states

- `pending`
- `leased`
- `running`
- `retry-wait`
- `completed`
- `error`
- `abandoned`
- `transferring` (reserved for future responsibility transfer)

### Why both `leased` and `running`

They are different facts.

- `leased`: the orchestrator handed out the item and is waiting for the worker to confirm start
- `running`: the worker confirmed execution

This distinction improves observability and timeout analysis.

## Durability

Durability is intentionally decoupled behind `DurableStore`.

Included implementations:

- `MemoryDurableStore` – zero-persistence testing / ephemeral mode
- `JsonFileDurableStore` – buffered append log + snapshots using Node filesystem
- `createDefussDbDurableStore()` – adapter against a tiny DB-like contract

### Why append log + snapshot

- append is cheap
- replay is simple
- snapshots bound restart time
- hot path can enqueue persistence work without awaiting disk

### Why terminal items are deleted from hot memory

Because otherwise queues become a museum of old pain.

Terminal and abandoned items are removed from active indices immediately. Optional short TTL tombstones exist only to absorb late worker replies and brief status polling after completion.

## Membership

Membership is just enough, not a cathedral.

Each peer entry has:

- `id`
- `endpoint`
- `incarnation`
- `lastSeenAt`
- optional metadata

Liveness is determined locally via `peerTtlMs`.

### Why no full gossip protocol in the package

Because the package is the **core engine**, not the transport layer. The RPC layer can announce peer up/down or exchange peer lists however it wants. The engine only needs the resulting peer table.

## Redirect semantics

If a peer receives `schedule()` for an item it is not the preferred owner for, it returns a redirect to the computed owner.

For `getStatus()` on an unknown item, the peer returns:

- `owner-known` redirect if it has local knowledge
- otherwise `owner-suggested` based on current rendezvous computation
- or `unknown` if no live peers exist

This is weaker than replicated-responsibility redirecting, but it avoids N² chatter and stays truthful.

## Across cores

Run one orchestrator process per core. Each process has:

- its own memory
- its own durable store directory
- its own peer ID and endpoint

This avoids shared-memory complexity. Cross-core transparency is then just peer transparency.

## Metrics

The engine emits to a tiny `TelemetrySink` interface.

Why:

- zero hard dependency on OTel in the core
- cheap no-op default
- any transport/exporter can adapt it later

The companion package `defuss-open-telemetry` bridges that interface into OTel-like meters.

## Future responsibility transfer

The current package reserves `transferring` state and versioned state changes, but it does not yet implement peer-to-peer handoff.

Why not yet:

- handoff semantics need accept/commit/ack choreography
- sticky ownership plus local durability is already enough for a clean first version
- transfer can be added later without breaking the core state model

## Operational guidance

- keep payloads small and bounded
- cache the accepted owner in clients
- use short tombstone retention instead of eternal memory growth
- prefer deterministic, pure selection functions
- keep peer membership reasonably converged; hashing is only as good as the live set view
