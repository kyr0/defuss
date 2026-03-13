/**
 * Server-Sent Events (SSE) example for defuss-express.
 *
 * Demonstrates:
 *   - SSE endpoint with proper headers
 *   - Periodic event streaming
 *   - Client disconnect handling
 *   - Browser-ready EventSource page
 */
import { express, startServer, stopServer } from "../src/index.js";

const PORT = 3000;

const app = express({ threads: 0 });
app.disable?.("x-powered-by");

app.get?.("/events", (_req: any, res: any) => {
  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let count = 0;
  const interval = setInterval(() => {
    count++;
    const event = { count, ts: Date.now(), pid: process.pid };
    res.write(`event: tick\ndata: ${JSON.stringify(event)}\n\n`);
    console.log(`[sse] sent event #${count} (pid ${process.pid})`);
  }, 1_000);

  // Clean up on client disconnect
  _req.on?.("close", () => {
    clearInterval(interval);
    console.log("[sse] client disconnected");
  });
});

// SSE demo page
app.get?.("/", (_req: any, res: any) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
<head><title>SSE Demo</title></head>
<body>
  <h1>Server-Sent Events</h1>
  <button onclick="start()">Connect</button>
  <button onclick="stop()">Disconnect</button>
  <pre id="log"></pre>
  <script>
    let es;
    function start() {
      es = new EventSource("/events");
      es.addEventListener("tick", (e) => {
        const data = JSON.parse(e.data);
        document.getElementById("log").textContent +=
          "#" + data.count + " from pid " + data.pid + " at " + new Date(data.ts).toISOString() + "\\n";
      });
      es.onerror = () => document.getElementById("log").textContent += "Connection error\\n";
    }
    function stop() { if (es) { es.close(); document.getElementById("log").textContent += "Disconnected\\n"; } }
  </script>
</body>
</html>`);
});

app.get?.("/health", (_req: any, res: any) => {
  res.status(200).json({ ok: true, pid: process.pid });
});

await startServer(app, { port: PORT, workers: "auto" });

console.log(`
  SSE example running on http://localhost:${PORT}

  Browser: open http://localhost:${PORT}
  CLI:     curl -N http://localhost:${PORT}/events
`);

setTimeout(() => {
  console.log("Auto-stopping...");
  stopServer();
}, 10_000);
