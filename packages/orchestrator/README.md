# `defuss-orchestrator`

TODO: Better docs etc., better test coverage. More realistic examples with long-running workers, snapshots, and durable state. Chaos testing with simulated worker and network failures.

Federated pull-based orchestration with:

- sticky ownership chosen by rendezvous hashing at schedule time
- async durability via buffered append log + snapshots or DB adapter
- worker pull topology only
- pluggable work selection and worker scoring
- tiny metrics sink interface

## Install

```bash
npm install defuss-orchestrator
```

## Basic usage

```ts
import {
  createOrchestrator,
  createJsonFileDurableStore,
} from "defuss-orchestrator";

const orchestrator = createOrchestrator({
  self: { id: "peer-a", endpoint: "http://127.0.0.1:3000" },
  durableStore: createJsonFileDurableStore({
    dir: "./tmp/orchestrator-a",
    flushThrottleMs: 50,
  }),
});

await orchestrator.start();
orchestrator.upsertPeer({ id: "peer-a", endpoint: "http://127.0.0.1:3000", incarnation: 1 });

const scheduled = orchestrator.schedule({
  id: "work-1",
  type: "image-render",
  payload: { prompt: "nebula" },
  payloadBytes: 22,
});

if (scheduled.kind === "accepted") {
  const lease = orchestrator.leaseNextWork({
    worker: {
      id: "worker-1",
      capabilities: ["image-render"],
      inflight: 0,
      telemetry: { cpuLoad: 0.2 },
    },
  });

  if (lease.kind === "leased") {
    orchestrator.reportCompleted({
      id: lease.workItem.id,
      workerId: "worker-1",
      result: { success: true, result: { imageId: "img-1" } },
    });
  }
}
```

## Notes

- The engine is deliberately **sticky-owner** after accept. Rendezvous hashing is used for initial placement only.
- Wrong peers can suggest an owner by hash, but they cannot always prove the accepted owner after membership churn without replicated responsibility data.
- Terminal and abandoned items leave hot memory. Optional tombstones exist for a short TTL to absorb late worker replies and status polls.

See `ARCH.md` for the guarantees and trade-offs.
