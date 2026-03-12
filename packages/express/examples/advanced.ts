import {
  express,
  startServer,
  stopServer,
  type LoadBalancerContext,
} from "../src/index.js";
import {
  createOpenTelemetrySink,
  InMemoryMeter,
} from "defuss-open-telemetry";

// ---------------------------------------------------------------------------
// Custom load balancer: sticky sessions for /api, lowest CPU for the rest
// ---------------------------------------------------------------------------

const customBalancer = ({ request, candidates }: LoadBalancerContext) => {
  if (request.path?.startsWith("/api") && request.headers["x-session-id"]) {
    // Hash the session header to a stable backend index
    const hash = [...request.headers["x-session-id"]].reduce(
      (acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0,
      0,
    );
    const picked = candidates[Math.abs(hash) % candidates.length]!;
    console.log(
      `[balancer] /api sticky → worker ${picked.id} (session ${request.headers["x-session-id"]})`,
    );
    return picked;
  }

  // Default: pick the worker with the lowest CPU usage
  const sorted = [...candidates].sort(
    (a, b) => (a.stats?.cpuPercent ?? 0) - (b.stats?.cpuPercent ?? 0),
  );
  const picked = sorted[0]!;
  console.log(
    `[balancer] ${request.method ?? "?"} ${request.path ?? "/"} → worker ${picked.id} (cpu ${picked.stats?.cpuPercent?.toFixed(1) ?? "?"}%)`,
  );
  return picked;
};

// ---------------------------------------------------------------------------
// Telemetry via InMemoryMeter (swap with OtelMeterAdapter for real OTel)
// ---------------------------------------------------------------------------

const meter = new InMemoryMeter();
const telemetry = createOpenTelemetrySink({
  meter,
  prefix: "defuss.express.",
});

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express({ threads: 0 });
app.disable("x-powered-by");

app.get("/", (_req: unknown, res: { status: (c: number) => { send: (b: string) => void } }) => {
  res.status(200).send("hello from advanced example");
});

app.get("/api/profile", (_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }) => {
  res.status(200).json({ user: "demo", pid: process.pid });
});

app.get("/health", (_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }) => {
  res.status(200).json({ ok: true, pid: process.pid });
});

// ---------------------------------------------------------------------------
// Start with advanced config
// ---------------------------------------------------------------------------

await startServer(app, {
  host: "0.0.0.0",
  port: 8080,
  workers: 4,
  loadBalancer: customBalancer,
  telemetry,

  // Tuning
  requestInspectionTimeoutMs: 25,
  maxHeaderBytes: 32 * 1024,
  workerHeartbeatIntervalMs: 30_000,
  gracefulShutdownTimeoutMs: 15_000,
});

// ---------------------------------------------------------------------------
// Auto-stop after 2 seconds, dump collected metrics
// ---------------------------------------------------------------------------

setTimeout(() => {
  console.log("\n--- InMemoryMeter metrics snapshot ---");
  for (const [name, entries] of meter.counters) {
    const total = entries.reduce((sum, e) => sum + e.value, 0);
    console.log(`  counter   ${name} = ${total} (${entries.length} calls)`);
  }
  for (const [name, entries] of meter.histograms) {
    const values = entries.map((e) => e.value);
    console.log(`  histogram ${name} = [${values.join(", ")}]`);
  }
  meter.collect();
  for (const [name, gauge] of meter.gauges) {
    const last = gauge.observations.at(-1);
    console.log(`  gauge     ${name} = ${last?.value ?? "n/a"}`);
  }
  console.log("--- shutting down ---\n");
  stopServer();
}, 2_000);
