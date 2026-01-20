// lb.ts — tiny L4 (TCP) round-robin load balancer for HTTP/WebSockets/etc.
// ✅ One port in → N backends out
// ✅ Round-robin (default) or IP-hash stickiness
// ✅ Backend eject/backoff on failure (avoids “Caddy ducks around” vibes)
// ✅ Works great with keep-alive + autocannon pipelining
//
// Run:
//   tsx lb.ts
//
// Env:
//   LISTEN_HOST=0.0.0.0
//   LISTEN_PORT=3000
//   BACKENDS=127.0.0.1:3001,127.0.0.1:3002,... (required)
//   POLICY=round_robin|ip_hash        (default: round_robin)
//   CONNECT_TIMEOUT_MS=1000           (default: 1000)
//   IDLE_TIMEOUT_MS=120000            (default: 120000)
//   EJECT_MS=1000                     (default: 1000)  // backend cooldown after failure
//   MAX_RETRIES=0                     (default: 0 => try all backends once)
//   TCP_KEEPALIVE_MS=30000            (default: 30000)
//   NO_DELAY=1                        (default: 1)
//   LOG=1                             (default: 1)

import net from "node:net";
import process from "node:process";

type Policy = "round_robin" | "ip_hash";

type Backend = {
    host: string;
    port: number;
    key: string; // "host:port"
    downUntil: number; // timestamp ms; skip backend until this time
    failures: number;
};

const LISTEN_HOST = process.env.LISTEN_HOST ?? "0.0.0.0";
const LISTEN_PORT = Number(process.env.LISTEN_PORT ?? 3000);

const BACKENDS_RAW =
    process.env.BACKENDS ??
    "127.0.0.1:3001,127.0.0.1:3002,127.0.0.1:3003,127.0.0.1:3004,127.0.0.1:3005,127.0.0.1:3006,127.0.0.1:3007,127.0.0.1:3008";

const POLICY = (process.env.POLICY ?? "round_robin") as Policy;

const CONNECT_TIMEOUT_MS = Number(process.env.CONNECT_TIMEOUT_MS ?? 1000);
const IDLE_TIMEOUT_MS = Number(process.env.IDLE_TIMEOUT_MS ?? 120_000);
const EJECT_MS = Number(process.env.EJECT_MS ?? 1000);

const TCP_KEEPALIVE_MS = Number(process.env.TCP_KEEPALIVE_MS ?? 30_000);
const NO_DELAY = (process.env.NO_DELAY ?? "1") !== "0";
const LOG = (process.env.LOG ?? "1") !== "0";

// MAX_RETRIES=0 => try each backend at most once
const MAX_RETRIES_ENV = Number(process.env.MAX_RETRIES ?? 0);

function parseBackends(raw: string): Backend[] {
    const list = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((hp) => {
            const [host, portStr] = hp.split(":");
            const port = Number(portStr);
            if (!host || !Number.isFinite(port) || port <= 0) {
                throw new Error(`Invalid BACKENDS entry: "${hp}"`);
            }
            return {
                host,
                port,
                key: `${host}:${port}`,
                downUntil: 0,
                failures: 0,
            } satisfies Backend;
        });

    if (list.length === 0) throw new Error("No BACKENDS configured");
    return list;
}

const backends = parseBackends(BACKENDS_RAW);

// Connection-level balancing state
let rr = 0;

// Keep track of sockets so shutdown is instant & clean
const openSockets = new Set<net.Socket>();

function nowMs() {
    return Date.now();
}

function log(...args: any[]) {
    if (LOG) console.log(...args);
}

function fnv1a32(str: string): number {
    // fast + stable 32-bit hash for ip_hash
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h * 0x01000193) >>> 0;
    }
    return h >>> 0;
}

function chooseBackendIndex(client: net.Socket): number {
    if (POLICY === "ip_hash") {
        // Stick per remote address (good enough for local/LAN; behind NAT it groups clients)
        const ip = client.remoteAddress ?? "0.0.0.0";
        const idx = fnv1a32(ip) % backends.length;
        return idx;
    }

    // round-robin
    const idx = rr % backends.length;
    rr = (rr + 1) >>> 0;
    return idx;
}

function nextCandidateIndices(startIdx: number): number[] {
    // iterate all indices, starting at startIdx, wrapping around
    const out: number[] = [];
    for (let i = 0; i < backends.length; i++) {
        out.push((startIdx + i) % backends.length);
    }
    return out;
}

function markBackendDown(b: Backend) {
    b.failures++;
    const cooldown = EJECT_MS * Math.min(10, b.failures); // mild backoff
    b.downUntil = nowMs() + cooldown;
}

function markBackendUp(b: Backend) {
    b.failures = 0;
    b.downUntil = 0;
}

function socketTune(s: net.Socket) {
    if (NO_DELAY) s.setNoDelay(true);
    s.setKeepAlive(true, TCP_KEEPALIVE_MS);
    // Destroy totally idle sockets (prevents resource leaks if clients vanish)
    s.setTimeout(IDLE_TIMEOUT_MS, () => s.destroy());
}

function wireDuplex(client: net.Socket, upstream: net.Socket) {
    // Pipe bytes both directions; no HTTP parsing; everything works.
    client.pipe(upstream);
    upstream.pipe(client);

    const destroyBoth = () => {
        if (!client.destroyed) client.destroy();
        if (!upstream.destroyed) upstream.destroy();
    };

    // Any side closes => tear down the other side
    client.on("close", () => upstream.destroy());
    upstream.on("close", () => client.destroy());

    client.on("error", destroyBoth);
    upstream.on("error", destroyBoth);

    // Make sure they're tracked for shutdown cleanup
    openSockets.add(client);
    openSockets.add(upstream);

    client.once("close", () => openSockets.delete(client));
    upstream.once("close", () => openSockets.delete(upstream));
}

function connectToBackend(
    client: net.Socket,
    candidateIdx: number,
    onSuccess: (upstream: net.Socket, backend: Backend) => void,
    onFail: (err: Error) => void
) {
    const b = backends[candidateIdx];

    // If backend is in cooldown window, fail fast
    if (b.downUntil > nowMs()) {
        onFail(new Error(`backend ${b.key} in cooldown`));
        return;
    }

    const upstream = net.connect({
        host: b.host,
        port: b.port,
        allowHalfOpen: true,
    });

    socketTune(upstream);

    // Hard connect timeout (important under load)
    const t = setTimeout(() => {
        upstream.destroy(new Error("connect timeout"));
    }, CONNECT_TIMEOUT_MS);

    upstream.once("connect", () => {
        clearTimeout(t);
        markBackendUp(b);
        onSuccess(upstream, b);
    });

    upstream.once("error", (err) => {
        clearTimeout(t);
        markBackendDown(b);
        onFail(err instanceof Error ? err : new Error(String(err)));
    });
}

function handleClient(client: net.Socket) {
    socketTune(client);

    // Don’t accept data until upstream is ready (keeps buffering sane)
    client.pause();

    const startIdx = chooseBackendIndex(client);
    const candidates = nextCandidateIndices(startIdx);

    const maxTries =
        MAX_RETRIES_ENV > 0 ? Math.min(MAX_RETRIES_ENV, candidates.length) : candidates.length;

    let attempt = 0;

    const tryNext = () => {
        if (client.destroyed) return;

        if (attempt >= maxTries) {
            client.destroy(new Error("no backends available"));
            return;
        }

        const idx = candidates[attempt++];
        connectToBackend(
            client,
            idx,
            (upstream, backend) => {
                // Now we have an upstream: wire it up and resume client flow
                if (client.destroyed) {
                    upstream.destroy();
                    return;
                }

                log(`[lb] ${client.remoteAddress ?? "?"}:${client.remotePort ?? "?"} -> ${backend.key}`);

                client.resume();
                wireDuplex(client, upstream);
            },
            () => {
                // failed backend: try next
                tryNext();
            }
        );
    };

    tryNext();
}

const server = net.createServer({ allowHalfOpen: true }, handleClient);

server.on("error", (e) => {
    console.error("[lb] server error:", e);
    process.exit(1);
});

// On some OSes this helps bursts; if unsupported it’s harmless.
try {
    // @ts-ignore
    server.maxConnections = 100_000;
} catch { }

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
    log(
        `[lb] listening on ${LISTEN_HOST}:${LISTEN_PORT} | policy=${POLICY} | backends=${backends
            .map((b) => b.key)
            .join(", ")}`
    );
});

function shutdown() {
    log("[lb] shutting down...");
    server.close(() => {
        // Destroy all remaining sockets so we exit immediately
        for (const s of openSockets) s.destroy();
        process.exit(0);
    });

    // If close hangs (rare), force exit
    setTimeout(() => {
        for (const s of openSockets) s.destroy();
        process.exit(0);
    }, 1500).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
