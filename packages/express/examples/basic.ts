import {
  express,
  resourceAwareLoadBalancer,
  startServer,
  stopServer,
} from "../src/index.js";

const app = express({ threads: 0 });
app.disable("x-powered-by");

app.get("/", (_req: unknown, res: { status: (code: number) => { send: (body: string) => void } }) => {
  res.status(200).send("defuss-express says hello");
});

app.get(
  "/health",
  (_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
    res.status(200).json({ ok: true, pid: process.pid });
  },
);

await startServer(app, {
  port: 3000,
  workers: "auto",
  workerHeartbeatIntervalMs: 15_000,
  loadBalancer: resourceAwareLoadBalancer,
});

// Auto-stop after 2 seconds (for demo purposes)
setTimeout(() => void stopServer(), 2_000);
