import cluster from "node:cluster";
import os from "node:os";
import process from "node:process";
import { Elysia } from "elysia";

const HOST = process.env.HOST ?? "0.0.0.0";
const BASE_PORT = Number(process.env.BASE_PORT ?? 3001);

// Node 18+ has availableParallelism()
const CPU_COUNT =
    typeof (os as any).availableParallelism === "function"
        ? (os as any).availableParallelism()
        : os.cpus().length;

const WORKERS = Number(process.env.WORKERS ?? CPU_COUNT);

function createApp() {
    return new Elysia()
        .get("/", () => new Response("ok", { status: 200 }))
        .get("/health", () => new Response("ok", { status: 200 }))
        .get("/ping", () => new Response("pong", { status: 200 }))
        .get("/json", () => Response.json({ ok: true }))
        .post("/json", ({ body }) => Response.json({ ok: true, got: body ?? null }))
        .get("/query", ({ query }) => Response.json({ q: (query as any).q ?? null }))
        .post("/body", ({ body }) =>
            Response.json({
                ok: true,
                bytes: JSON.stringify(body ?? {}).length,
            }),
        );
}

function startWorker(port: number) {
    const app = createApp();

    app.listen({ port, hostname: HOST }, () => {
        console.log(`[worker ${process.pid}] listening on http://${HOST}:${port}`);
    });

    const shutdown = () => {
        console.log(`[worker ${process.pid}] shutdown`);
        try {
            app.stop();
        } catch { }
        process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}

if (cluster.isPrimary) {
    console.log(
        `[master ${process.pid}] starting ${WORKERS} workers on ports ${BASE_PORT}..${BASE_PORT + WORKERS - 1}`
    );

    for (let i = 0; i < WORKERS; i++) {
        cluster.fork({ WORKER_INDEX: String(i) });
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(
            `[master] worker ${worker.process.pid} died (${code ?? signal}), restarting`
        );
        cluster.fork();
    });

    const shutdown = () => {
        console.log(`[master ${process.pid}] shutdown`);
        for (const id in cluster.workers) cluster.workers[id]?.kill("SIGTERM");
        process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
} else {
    const idx = Number(process.env.WORKER_INDEX ?? 0);
    startWorker(BASE_PORT + idx);
}
