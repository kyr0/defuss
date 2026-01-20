import cluster from "node:cluster";
import os from "node:os";
import process from "node:process";
import express from "ultimate-express";

const HOST = process.env.HOST ?? "0.0.0.0";
const BASE_PORT = Number(process.env.BASE_PORT ?? 3001);

// Node 18+ has availableParallelism()
const CPU_COUNT =
    typeof (os as any).availableParallelism === "function"
        ? (os as any).availableParallelism()
        : os.cpus().length;

const WORKERS = Number(process.env.WORKERS ?? CPU_COUNT);

function createApp() {
    const app = express();
    app.disable("x-powered-by");

    app.get("/", (_req, res) => res.status(200).send("ok"));
    app.get("/health", (_req, res) => res.status(200).send("ok"));

    app.get("/ping", (_req, res) => res.status(200).send("pong"));

    app.get("/json", (_req, res) => res.status(200).json({ ok: true }));

    // POST JSON payload to /json (for body+response benching)
    app.post("/json", express.json(), (req, res) => {
        res.status(200).json({ ok: true, got: req.body ?? null });
    });

    app.get("/query", (req, res) => {
        res.status(200).json({ q: req.query.q ?? null });
    });

    app.post("/body", express.json(), (req, res) => {
        res.status(200).json({
            ok: true,
            bytes: JSON.stringify(req.body ?? {}).length,
        });
    });

    return app;
}

function startWorker(port: number) {
    const app = createApp();

    const server = app.listen(port as any, HOST as any, () => {
        console.log(`[worker ${process.pid}] listening on http://${HOST}:${port}`);
    });

    const shutdown = () => {
        console.log(`[worker ${process.pid}] shutdown`);
        try {
            // @ts-ignore
            server?.close?.();
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
