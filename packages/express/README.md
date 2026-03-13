# defuss-express

> Extremely performant (!), express-compatible, auto-multi-core, QUIC/HTTP/3-enabled, WebSocket-capable, load-balanced, ultimate-express-powered server runtime for defuss.

`defuss-express` is a thin runtime wrapper around `ultimate-express` (and thus `express` API compatible!) that starts your app in one worker per CPU core and places a tiny TCP load balancer in front of those workers.

The intended developer experience is boring in the best way: you simply change your import from `express` to `defuss-express`, and immediately, your app will scale in the best way possible. 

This package handles worker ports, process restarts, request fan-out, and worker telemetry using `defuss-open-telemetry` hooks. 

You can even customize load balancing strategies based on request metadata and live worker stats, or just leverage the built-in round-robin or least-connections balancer algorithms.

## Features

- Node.js based for maximum compatibility with existing Express apps and middleware
- automatic multi-core startup
- TCP-level load balancing proxy in the primary process
- request-aware load balancing hooks
- default round-robin balancing
- worker CPU and memory telemetry over IPC
- worker auto-respawn
- `ultimate-express` re-exported as `express`
- zero app-level cluster boilerplate
- graceful shutdown handling with signal handlers and timeouts
- QUIC/HTTP/3 and WebSocket support out of the box (via `ultimate-express`)
- built-in benchmarks with realistic, real-world  payloads
- as little 3rd-party dependencies as possible (`ultimate-express` and `defuss-open-telemetry` for telemetry features)

## Install

```bash
bun/pnpm/yarn add defuss-express
```

Note: We use bun as a _package manager_ only here.
Node.js is the intended runtime for `defuss-express` apps.

## Basic usage

```ts
import { express, startServer, stopServer } from "defuss-express";

const app = express({ threads: 0 });
app.disable("x-powered-by");

app.get("/", (_req, res) => {
  res.status(200).send("hello");
});

await startServer(app);

process.on("SIGINT", () => {
  stopServer();
});
process.on("SIGTERM", () => {
  stopServer();
});
```

## Custom balancing

`loadBalancer` receives the parsed HTTP request head, the candidate backend list, and the client socket.

```ts
import {
  express,
  setServerConfig,
  startServer,
  type BackendCandidate,
} from "defuss-express";

const chooseLowestCpu = (candidates: BackendCandidate[]) =>
  [...candidates].sort(
    (left, right) => (left.stats?.cpuPercent ?? 0) - (right.stats?.cpuPercent ?? 0),
  )[0]!;

setServerConfig({
  loadBalancer: ({ request, candidates }) => {
    if (request.path?.startsWith("/realtime")) {
      return chooseLowestCpu(candidates);
    }

    return candidates[0]!;
  },
});

const app = express({ threads: 0 });
await startServer(app);
```

## Advanced server config

The full config object is passed to `startServer` or `setServerConfig` before startup. This example shows request-aware routing with a custom load balancer, opt-in telemetry via `defuss-open-telemetry`, and tuned timeouts:

```ts
import { express, startServer, type LoadBalancerContext } from "defuss-express";
import { createOpenTelemetrySink, OtelMeterAdapter } from "defuss-open-telemetry";
import { metrics } from "@opentelemetry/api";

// Custom load balancer: sticky sessions for /api, lowest CPU for everything else
const customBalancer = ({ request, candidates, previousIndex }: LoadBalancerContext) => {
  if (request.path?.startsWith("/api") && request.headers["x-session-id"]) {
    // Hash the session header to a stable backend index
    const hash = [...request.headers["x-session-id"]].reduce(
      (acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0,
      0,
    );
    return candidates[Math.abs(hash) % candidates.length]!;
  }

  // Default: pick the worker with the lowest CPU usage
  return [...candidates].sort(
    (a, b) => (a.stats?.cpuPercent ?? 0) - (b.stats?.cpuPercent ?? 0),
  )[0]!;
};

const app = express({ threads: 0 });

await startServer(app, {
  host: "0.0.0.0",
  port: 8080,
  workers: 4,
  loadBalancer: customBalancer,

  // Opt-in OpenTelemetry (omit for silent no-op)
  telemetry: createOpenTelemetrySink({
    meter: new OtelMeterAdapter(metrics.getMeter("my-app")),
    prefix: "defuss.express.",
  }),

  // Tuning
  requestInspectionTimeoutMs: 25,   // more time to sniff headers
  maxHeaderBytes: 32 * 1024,        // allow larger headers
  workerHeartbeatIntervalMs: 30_000,
  gracefulShutdownTimeoutMs: 15_000,
});
```

The `LoadBalancerContext` provides `candidates` (healthy backends with live CPU/memory stats), `request` (parsed method, path, host, headers), `socket` (raw TCP socket), and `previousIndex` (for round-robin tracking). Return the `BackendCandidate` that should receive the connection.

## API

### `express`

Re-export of `ultimate-express`. Please see the [ultimate-express documentation](https://github.com/dimdenGD/ultimate-express/tree/main) for details on compatibility and caveats/limitations. Almost all of the `express` features are supported, including WebSockets and HTTP/3. There are _tiny_ differences/edge cases to be aware of, but this shouldn't be a concern for typical apps.

Make sure to implement end-2-end tests for your app to verify compatibility if you are using advanced or rarely used `express` features before you migrate to `defuss-express`. We haven't found any issues in our testing, but there are so many `express` features and combinations that we can't guarantee 100% compatibility in all edge cases. That said, if you do find any issues, please report them! This package is actively maintained and we will prioritize fixes to ensure maximum compatibility with the `express` API.

### `setServerConfig(config)`

Sets global runtime config before `startServer(app)`.

```ts
setServerConfig({
  host: "0.0.0.0",
  port: 3000,
  workerHost: "127.0.0.1",
  baseWorkerPort: 3001,
  workers: "auto",
  workerHeartbeatIntervalMs: 60_000,
  workerHeartbeatStaleAfterMs: 150_000,
  requestInspectionTimeoutMs: 10,
  maxHeaderBytes: 16 * 1024,
  gracefulShutdownTimeoutMs: 10_000,
  respawnWorkers: true,
  installSignalHandlers: true,
});
```

### `startServer(app, config?)`

Starts the runtime. In the primary process it forks workers and starts the TCP balancer. In worker processes it binds the app to a worker port.

### `stopServer(graceful=true)`

Stops the balancer or the worker server depending on the current process role.

A _graceful_ shutdown (default) first stops accepting new connections, then waits for in-flight requests to finish until the `gracefulShutdownTimeoutMs` is reached, at which point it forcefully terminates any remaining connections and exits.

A _non-graceful_ shutdown immediately terminates all connections and exits.

### Built-in load balancer strategies

- `roundRobinLoadBalancer`
- `leastConnectionsLoadBalancer`
- `resourceAwareLoadBalancer`
- `defaultLoadBalancer`

## Implementation details and design notes

### Should I store state in-memory in my app? Can I simply declare a global variable to share state across requests or per-session? Does this handle statefulness?

General advice: VERY BAD IDEA. If you CAN decide for an architecture, DO NOT implement any statefulness in-memory if you want your system to be horizontally scalable!

Memory is usually not shared across processes. And thus, when a user request hits the load balancer, it could be routed to **any** of the available worker processes. Your app will behave **flaky** if **_sometimes_** the request hits the worker with the expected in-memory state, and **_sometimes_** it hits a different worker that doesn't have that state. This is a fundamental consequence of the multi-core model and how load balancers work.

Therefore, you can:
- Use an external state store. `defuss-sharedmemory`, `defuss-redis` or `defuss-db` are great candidates for that. 

- Use `defuss-redis` or `defuss-db` if you need to share state across multiple machines, or want the convenience of a higher-level data model and don't mind the extra latency of a network round trip to your state store.

- Use `defuss-sharedmemory` if you only deploy to 1 SINGLE HOST (no horizontal scaling across multiple machines) and want the lowest possible latency for state access.

That being said, should you have any other specific requirements for statefulness (aka. you need sticky sessions, have `Bearer` token auth/API auth with state managed per-session **in memory and per process**), you **MUST MESS WITH** implementing a custom load balancer strategy via `setServerConfig` in order to pin requests to a specific process once the machine you're running this on, has more than one CPU core/hyperthread. You could use the request metadata (headers, path, etc.) to hash to a specific backend index (see `defuss-hash` for federated hashing).

### Operational notes on multi-core behavior

The same entry module is executed in both the primary process and each worker. That means app construction should be deterministic and free of one-shot side effects that are only safe in a single process.

The primary process does not terminate TLS or parse full HTTP bodies. It only sniffs the request head long enough to let a custom balancer inspect method, path, and headers, then proxies bytes to the selected worker.

WebSocket upgrades continue to work because the proxy is plain TCP after backend selection.

## Commands

```bash
bun run check
bun run test
bun run build
bun run bench        # throughput benchmark (DSON payloads)
bun run bench:server # start benchmark server standalone
```

## Benchmarks

Measured with [autocannon](https://github.com/mcollina/autocannon) on Apple Macbook Air M4 (8 cores), 100 concurrent connections, 10 s per scenario + 3 s warmup. Server uses `resourceAwareLoadBalancer`. Payloads are serialized/deserialized through `defuss-dson` (typed superset of JSON supporting `Date`, `Map`, `Set`, `RegExp`, `BigInt`, `Uint8Array`, …).

```
bun run bench
```

| Scenario | Avg Req/s | p50 | p99 | Throughput |
|---|---|---|---|---|
| GET /dson/generate (complex typed object) | **36,384** | 2 ms | 13 ms | 186 MB/s |
| POST /dson/echo (small, 3 fields) | **52,841** | 1 ms | 4 ms | 18 MB/s |
| POST /dson/echo (medium, 100 users) | **10,168** | 8 ms | 25 ms | 179 MB/s |
| POST /dson/transform (enrich 100 users) | **10,560** | 8 ms | 23 ms | 188 MB/s |
| POST /dson/echo (large, 500 records + binary) | **750** | 120 ms | 299 ms | 228 MB/s |

Zero errors across all scenarios. Results scale linearly with core count.

## License

MIT
