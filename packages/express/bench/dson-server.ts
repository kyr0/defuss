/**
 * Benchmark server for defuss-express with DSON payload processing.
 *
 * Spawns one worker per CPU core. Each worker runs three routes:
 *   POST /dson/echo       – parse DSON body, re-serialize, return
 *   POST /dson/transform  – parse DSON body, enrich with metadata, re-serialize
 *   GET  /dson/generate   – build a complex typed object, serialize with DSON
 *
 * Start:  node --import tsx bench/dson-server.ts
 * Stop:   SIGINT / SIGTERM
 */
import { DSON } from "defuss-dson";
import {
  express,
  setServerConfig,
  startServer,
  stopServer,
  resourceAwareLoadBalancer,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = Number(process.env.BENCH_PORT ?? 4000);

setServerConfig({
  port: PORT,
  workers: "auto",
  workerHeartbeatIntervalMs: 5_000,
  loadBalancer: resourceAwareLoadBalancer,
  installSignalHandlers: true,
});

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express({ threads: 0 });
app.disable?.("x-powered-by");

// Raw body middleware – collect the full body as a string
app.use?.((req: any, _res: any, next: any) => {
  if (req.method === "GET" || req.method === "HEAD") return next();
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    req.body = Buffer.concat(chunks).toString("utf-8");
    next();
  });
});

/** POST /dson/echo – parse + re-serialize (round-trip stress) */
app.post?.("/dson/echo", (req: any, res: any) => {
  const parsed = DSON.parse(req.body);
  const out = DSON.stringify(parsed);
  res.setHeader("Content-Type", "application/json");
  res.status(200).send(out);
});

/** POST /dson/transform – parse, enrich, re-serialize */
app.post?.("/dson/transform", (req: any, res: any) => {
  const parsed = DSON.parse(req.body) as Record<string, unknown>;
  const enriched = {
    ...parsed,
    _processedBy: process.pid,
    _processedAt: new Date(),
    _tags: new Set(["benchmark", "transform", `worker-${process.pid}`]),
  };
  const out = DSON.stringify(enriched);
  res.setHeader("Content-Type", "application/json");
  res.status(200).send(out);
});

/** GET /dson/generate – build a complex typed payload, serialize */
app.get?.("/dson/generate", (_req: any, res: any) => {
  const payload = {
    id: crypto.randomUUID(),
    createdAt: new Date(),
    tags: new Set(["alpha", "beta", "gamma"]),
    metadata: new Map<string, unknown>([
      ["version", 1],
      ["flags", new Uint8Array([0xff, 0x00, 0xab, 0xcd])],
      ["nested", { regex: /^hello\s+world$/i, big: BigInt("9007199254740993") }],
    ]),
    items: Array.from({ length: 50 }, (_, i) => ({
      index: i,
      value: Math.random(),
      label: `item-${i}`,
      active: i % 3 !== 0,
    })),
  };
  const out = DSON.stringify(payload);
  res.setHeader("Content-Type", "application/json");
  res.status(200).send(out);
});

/** GET /health – simple health check */
app.get?.("/health", (_req: any, res: any) => {
  res.status(200).json({ ok: true, pid: process.pid });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

void startServer(app).then((result) => {
  if (result.mode === "primary") {
    console.log(
      `\n[bench] server ready on http://localhost:${PORT} ` +
        `(${result.workers} workers)\n`,
    );
  }
});
