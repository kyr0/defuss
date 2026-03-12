/**
 * Throughput benchmark for defuss-express + defuss-dson.
 * Simulates various realistic scenarios with different payload sizes and processing complexity.
 * Especially defuss-dson is the basis for defuss-rpc.
 *
 * Uses autocannon (via bunx) for industry-standard HTTP benchmarking.
 * Spawns the DSON server, waits for readiness, writes payload files,
 * then runs autocannon against each scenario.
 *
 * Usage:
 *   bun run bench
 *   BENCH_CONCURRENCY=200 BENCH_DURATION_S=10 bun run bench
 */

import { spawn, execSync, type ChildProcess } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { DSON } from "defuss-dson";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = Number(process.env.BENCH_PORT ?? 4000);
const BASE = `http://localhost:${PORT}`;
const CONCURRENCY = Number(process.env.BENCH_CONCURRENCY ?? 100);
const DURATION_S = Number(process.env.BENCH_DURATION_S ?? 10);
const WARMUP_S = 3;
const TMP_DIR = new URL("../.bench-tmp/", import.meta.url).pathname;

// ---------------------------------------------------------------------------
// Payloads (pre-serialized with DSON, written to temp files for autocannon -b)
// ---------------------------------------------------------------------------

const smallPayload = DSON.stringify({
  user: "bench",
  ts: new Date(),
  ids: new Set([1, 2, 3]),
});

const mediumPayload = DSON.stringify({
  users: Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `user-${i}`,
    email: `user-${i}@example.com`,
    createdAt: new Date(Date.now() - i * 86_400_000),
    roles: new Set(["reader", i % 5 === 0 ? "admin" : "editor"]),
    prefs: new Map([
      ["theme", i % 2 === 0 ? "dark" : "light"],
      ["lang", "en"],
    ]),
  })),
});

const largePayload = DSON.stringify({
  records: Array.from({ length: 500 }, (_, i) => ({
    id: crypto.randomUUID(),
    index: i,
    timestamp: new Date(),
    data: new Uint8Array(Array.from({ length: 64 }, (_, j) => (i + j) & 0xff)),
    tags: new Set([`tag-${i % 10}`, `group-${i % 3}`]),
    metrics: new Map([
      ["cpu", Math.random() * 100],
      ["mem", Math.random() * 8192],
      ["latency", Math.random() * 50],
    ]),
    nested: {
      regex: new RegExp(`^item-${i}$`, "i"),
      big: BigInt(i) * BigInt("1000000000000"),
    },
  })),
});

function writePayloads() {
  mkdirSync(TMP_DIR, { recursive: true });
  writeFileSync(`${TMP_DIR}small.json`, smallPayload);
  writeFileSync(`${TMP_DIR}medium.json`, mediumPayload);
  writeFileSync(`${TMP_DIR}large.json`, largePayload);
}

function cleanupPayloads() {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

interface Scenario {
  name: string;
  method: "GET" | "POST";
  path: string;
  bodyFile?: string;
  label: string;
}

const scenarios: Scenario[] = [
  {
    name: "GET /dson/generate",
    method: "GET",
    path: "/dson/generate",
    label: "Generate complex DSON payload (50 items, Map, Set, BigInt, RegExp)",
  },
  {
    name: "POST /dson/echo (small)",
    method: "POST",
    path: "/dson/echo",
    bodyFile: `${TMP_DIR}small.json`,
    label: "Round-trip small DSON (3 fields: Date, Set)",
  },
  {
    name: "POST /dson/echo (medium)",
    method: "POST",
    path: "/dson/echo",
    bodyFile: `${TMP_DIR}medium.json`,
    label: "Round-trip medium DSON (100 users with Set + Map per user)",
  },
  {
    name: "POST /dson/transform (medium)",
    method: "POST",
    path: "/dson/transform",
    bodyFile: `${TMP_DIR}medium.json`,
    label: "Parse + enrich + re-serialize 100-user DSON payload",
  },
  {
    name: "POST /dson/echo (large)",
    method: "POST",
    path: "/dson/echo",
    bodyFile: `${TMP_DIR}large.json`,
    label: "Round-trip large DSON (500 records, Uint8Array, BigInt, RegExp)",
  },
];

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

function startServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "node",
      ["--import", "tsx", "bench/dson-server.ts"],
      {
        cwd: new URL("..", import.meta.url).pathname,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, BENCH_PORT: String(PORT) },
      },
    );

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("Server did not start within 15 s"));
        child.kill("SIGTERM");
      }
    }, 15_000);

    child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      process.stdout.write(text);
      if (!resolved && text.includes("server ready")) {
        resolved = true;
        clearTimeout(timeout);
        resolve(child);
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      process.stderr.write(data);
    });

    child.once("exit", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
  });
}

async function waitForHealthy(maxMs = 10_000): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Server did not become healthy");
}

// ---------------------------------------------------------------------------
// Autocannon runner
// ---------------------------------------------------------------------------

function runAutocannon(scenario: Scenario): void {
  const args = [
    "-c", String(CONCURRENCY),
    "-d", String(DURATION_S),
    "-w", String(WARMUP_S),
    "-m", scenario.method,
  ];

  if (scenario.bodyFile) {
    args.push("-i", scenario.bodyFile);
    args.push("-H", "Content-Type=application/json");
  }

  args.push(`${BASE}${scenario.path}`);

  execSync(`bunx autocannon ${args.join(" ")}`, {
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(72));
  console.log(" defuss-express + defuss-dson  ·  autocannon benchmark");
  console.log("=".repeat(72));
  console.log(`  Concurrency : ${CONCURRENCY}`);
  console.log(`  Duration    : ${DURATION_S}s per scenario (+${WARMUP_S}s warmup)`);
  console.log(`  Port        : ${PORT}`);
  console.log();

  writePayloads();
  console.log("[bench] Payload sizes:");
  console.log(`  small  : ${smallPayload.length} bytes`);
  console.log(`  medium : ${mediumPayload.length} bytes`);
  console.log(`  large  : ${largePayload.length} bytes`);
  console.log();

  console.log("[bench] Starting server...");
  const server = await startServer();

  try {
    await waitForHealthy();

    for (const scenario of scenarios) {
      console.log("\n" + "-".repeat(72));
      console.log(`  ${scenario.name}`);
      console.log(`  ${scenario.label}`);
      console.log("-".repeat(72));
      runAutocannon(scenario);
    }

    console.log("\n" + "=".repeat(72));
    console.log(" All scenarios complete");
    console.log("=".repeat(72) + "\n");
  } finally {
    server.kill("SIGTERM");
    cleanupPayloads();
    await new Promise((r) => setTimeout(r, 500));
  }
}

main().catch((err) => {
  console.error("[bench] Fatal:", err);
  cleanupPayloads();
  process.exit(1);
});
