import os from "node:os";
import fs from "node:fs/promises";
import autocannon from "autocannon";

process.setMaxListeners(0);

const URL = process.env.URL ?? "http://127.0.0.1:3000/ping";
const DURATION = Number(process.env.DURATION ?? 10);
const WARMUP = Number(process.env.WARMUP ?? 2);
// Keep sockets low, push RPS via pipelining instead
const PIPELINING = Number(process.env.PIPELINING ?? 16);

// Autocannon can use worker threads to generate more load. :contentReference[oaicite:5]{index=5}

// IMPORTANT: workers generate load in multiple threads; keep it modest locally
const BENCH_WORKERS = Number(process.env.BENCH_WORKERS ?? 2);

// Start low to avoid FD/ephemeral-port pain on laptops
const CONNECTIONS = (process.env.CONNECTIONS ??
    "10,25,50,75,100,150,200,300,400").split(",").map((x) => Number(x.trim()));

const METHOD = (process.env.METHOD ?? "GET").toUpperCase();
const PATH = process.env.PATH ?? "";
const BODY = process.env.BODY ?? "";

function titleFor(connections: number) {
    return `${connections}c p${PIPELINING} w${BENCH_WORKERS}`;
}

function runOnce({ connections, warmup = false }: { connections: number; warmup?: boolean }) {
    return new Promise((resolve, reject) => {
        const opts = {
            url: URL + PATH,
            connections,
            duration: warmup ? WARMUP : DURATION,
            pipelining: PIPELINING,
            workers: BENCH_WORKERS,
            method: METHOD,
            headers: {
                Connection: "keep-alive",
                ...(METHOD !== "GET" && METHOD !== "HEAD"
                    ? { "content-type": "application/json" }
                    : {}),
            },
            body: BODY || (METHOD === "POST" ? JSON.stringify({ hello: "world" }) : undefined),

        };

        const inst = autocannon(opts as any, (err, res) => {
            if (err) return reject(err);
            return resolve(res);
        });

        //autocannon.track(inst, { renderProgressBar: true });
    });
}

function pick(res: any, connections: number) {
    const non2xx = res.non2xx ?? 0;
    const errors =
        (res.errors ?? 0) +
        (res.timeouts ?? 0) +
        (res.resets ?? 0) +
        (res["1xx"] ?? 0); // harmless but keep it visible

    return {
        connections,
        rps_avg: Math.round(res.requests.average),
        rps_max: Math.round(res.requests.max),
        p50_ms: Math.round(res.latency.p50),
        p99_ms: Math.round(res.latency.p99),
        throughput_mb_s: Number((res.throughput.average / (1024 * 1024)).toFixed(2)),
        non2xx,
        errors,
    };
}

async function main() {
    console.log(`\nTarget: ${URL + PATH}`);
    console.log(
        `Config: duration=${DURATION}s warmup=${WARMUP}s pipelining=${PIPELINING} bench_workers=${BENCH_WORKERS} method=${METHOD}`
    );

    console.log("\nWarmup...");
    await runOnce({ connections: Math.max(10, Math.floor(CONNECTIONS[0] / 5)), warmup: true });

    const rows = [];
    for (const c of CONNECTIONS) {
        console.log(`\n=== Step: ${titleFor(c)} ===`);
        const res = await runOnce({ connections: c, warmup: false });
        rows.push(pick(res, c));
    }

    console.log("\nSummary:");
    console.table(rows);

    const out = {
        ts: new Date().toISOString(),
        url: URL + PATH,
        config: { DURATION, WARMUP, PIPELINING, BENCH_WORKERS, METHOD, CONNECTIONS },
        rows,
    };

    await fs.writeFile("bench-results.json", JSON.stringify(out, null, 2));
    console.log("\nWrote bench-results.json");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
