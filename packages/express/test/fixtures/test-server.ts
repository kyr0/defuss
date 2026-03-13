/**
 * Test server for integration tests.
 *
 * Registers routes for: health, file delivery, file upload, SSE,
 * JWT-protected endpoints. WebSocket is handled via app.uwsApp.
 *
 * Spawned as a child process by integration tests.
 */
import { join } from "node:path";
import { readFileSync } from "node:fs";
import {
  express,
  startServer,
  setServerConfig,
} from "../../src/index.js";

const PORT = Number(process.env.TEST_PORT ?? 4444);

setServerConfig({
  port: PORT,
  workers: 1,
  workerHeartbeatIntervalMs: 5_000,
  installSignalHandlers: true,
  logger: {
    debug: () => {},
    info: (...args: unknown[]) => console.log(...args),
    warn: (...args: unknown[]) => console.warn(...args),
    error: (...args: unknown[]) => console.error(...args),
  },
});

const app = express({ threads: 0 });
app.disable?.("x-powered-by");

// ── Health ───────────────────────────────────────────────────────────
app.get?.("/health", (_req: any, res: any) => {
  res.status(200).json({ ok: true, pid: process.pid });
});

// ── File delivery: inline ────────────────────────────────────────────
app.get?.("/file/inline", (_req: any, res: any) => {
  const content = readFileSync(join(import.meta.dirname, "sample.txt"), "utf-8");
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(content);
});

// ── File delivery: download (content-disposition: attachment) ────────
app.get?.("/file/download", (_req: any, res: any) => {
  const filePath = join(import.meta.dirname, "sample.txt");
  res.download(filePath, "sample-download.txt");
});

// ── File delivery: no-cache ──────────────────────────────────────────
app.get?.("/file/no-cache", (_req: any, res: any) => {
  const content = readFileSync(join(import.meta.dirname, "sample.txt"), "utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Content-Type", "text/plain");
  res.send(content);
});

// ── File upload ──────────────────────────────────────────────────────
app.post?.("/upload", (req: any, res: any) => {
  const chunks: Buffer[] = [];
  let received = 0;
  const total = Number(req.headers["content-length"] ?? 0);

  req.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
    received += chunk.length;
  });

  req.on("end", () => {
    const body = Buffer.concat(chunks);
    res.status(200).json({
      received: body.length,
      expectedLength: total,
      match: body.length === total,
    });
  });
});

// ── SSE ──────────────────────────────────────────────────────────────
app.get?.("/sse", (_req: any, res: any) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let count = 0;
  const interval = setInterval(() => {
    count++;
    res.write(`data: ${JSON.stringify({ count, ts: Date.now() })}\n\n`);
    if (count >= 3) {
      clearInterval(interval);
      res.end();
    }
  }, 50);

  _req.on?.("close", () => clearInterval(interval));
});

// ── JWT-protected endpoint ───────────────────────────────────────────
app.get?.("/protected", (req: any, res: any) => {
  const authHeader = req.headers?.authorization ?? req.get?.("authorization") ?? "";
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = authHeader.slice("Bearer ".length);
  res.status(200).json({ ok: true, tokenReceived: token.length > 0 });
});

// ── JWT validation endpoint (server-side validation) ─────────────────
app.post?.("/verify-token", (req: any, res: any) => {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
      res.status(200).json({
        ok: true,
        hasToken: typeof body.token === "string" && body.token.length > 0,
      });
    } catch {
      res.status(400).json({ error: "Invalid JSON body" });
    }
  });
});

// ── WebSocket echo (via uWebSockets.js native API) ───────────────────
const setupWebSocket = () => {
  try {
    const uwsApp = (app as any).uwsApp;
    if (uwsApp?.ws) {
      uwsApp.ws("/ws", {
        open: () => {},
        message: (ws: any, message: ArrayBuffer, isBinary: boolean) => {
          ws.send(message, isBinary);
        },
        close: () => {},
      });
    }
  } catch {
    // uwsApp may not be available in all contexts
  }
};

// ── Start ────────────────────────────────────────────────────────────
void startServer(app).then((result) => {
  if (result.mode === "primary") {
    console.log(`[test-server] server ready on http://localhost:${PORT} (${result.workers} workers)`);
  }
  if (result.mode === "worker") {
    setupWebSocket();
  }
});
