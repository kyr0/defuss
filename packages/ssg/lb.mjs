import net from "node:net";

const LISTEN_HOST = process.env.LISTEN_HOST ?? "0.0.0.0";
const LISTEN_PORT = Number(process.env.LISTEN_PORT ?? 3000);

// comma-separated: "127.0.0.1:3001,127.0.0.1:3002,..."
const BACKENDS_RAW =
  process.env.BACKENDS ??
  "127.0.0.1:3001,127.0.0.1:3002,127.0.0.1:3003,127.0.0.1:3004,127.0.0.1:3005,127.0.0.1:3006,127.0.0.1:3007,127.0.0.1:3008";

const BACKENDS = BACKENDS_RAW.split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((hp) => {
    const [host, portStr] = hp.split(":");
    const port = Number(portStr);
    if (!host || !port) throw new Error(`Invalid backend: ${hp}`);
    return { host, port };
  });

let rr = 0;

function pickBackend() {
  const b = BACKENDS[rr % BACKENDS.length];
  rr = (rr + 1) >>> 0;
  return b;
}

function connectBackend(client, attemptsLeft = BACKENDS.length) {
  const b = pickBackend();

  const upstream = net.connect(
    { host: b.host, port: b.port, allowHalfOpen: true },
    () => {
      // Low latency; optional
      client.setNoDelay(true);
      upstream.setNoDelay(true);

      // Pipe bytes both ways
      client.pipe(upstream);
      upstream.pipe(client);
    }
  );

  const cleanup = () => {
    client.destroy();
    upstream.destroy();
  };

  upstream.on("error", (err) => {
    // backend unreachable -> try another backend
    upstream.destroy();
    if (attemptsLeft > 1) {
      connectBackend(client, attemptsLeft - 1);
    } else {
      client.destroy(err);
    }
  });

  client.on("error", cleanup);
  client.on("close", () => upstream.destroy());
  upstream.on("close", () => client.destroy());
}

const server = net.createServer({ allowHalfOpen: true }, (client) => {
  connectBackend(client);
});

server.on("error", (e) => {
  console.error("LB server error:", e);
  process.exit(1);
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(
    `LB listening on ${LISTEN_HOST}:${LISTEN_PORT} -> ${BACKENDS.map((b) => `${b.host}:${b.port}`).join(", ")}`
  );
});

function shutdown() {
  console.log("shutting down LB...");
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
