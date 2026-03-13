/**
 * WebSocket echo server example for defuss-express.
 *
 * Uses the uWebSockets.js native ws() API via app.uwsApp.
 * The TCP load balancer in defuss-express transparently proxies
 * WebSocket upgrade requests to workers.
 *
 * Note: WebSocket setup must happen AFTER app.listen() because
 * uwsApp is initialised during listen.
 */
import { express, startServer, stopServer } from "../src/index.js";

const PORT = 3000;

const app = express({ threads: 0 });
app.disable?.("x-powered-by");

app.get?.("/", (_req: any, res: any) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
<head><title>WebSocket Echo</title></head>
<body>
  <h1>WebSocket Echo Server</h1>
  <input id="msg" value="Hello WebSocket!" />
  <button onclick="send()">Send</button>
  <pre id="log"></pre>
  <script>
    const ws = new WebSocket("ws://localhost:${PORT}/ws");
    const log = document.getElementById("log");
    ws.onopen = () => log.textContent += "Connected\\n";
    ws.onmessage = (e) => log.textContent += "Received: " + e.data + "\\n";
    ws.onclose = () => log.textContent += "Disconnected\\n";
    function send() {
      const msg = document.getElementById("msg").value;
      ws.send(msg);
      log.textContent += "Sent: " + msg + "\\n";
    }
  </script>
</body>
</html>`);
});

app.get?.("/health", (_req: any, res: any) => {
  res.status(200).json({ ok: true, pid: process.pid });
});

await startServer(app, { port: PORT, workers: 1 });

// Set up WebSocket echo handler via uWebSockets.js native API
try {
  const uwsApp = (app as any).uwsApp;
  if (uwsApp?.ws) {
    uwsApp.ws("/ws", {
      open: (ws: any) => {
        console.log(`[ws] client connected (pid ${process.pid})`);
      },
      message: (ws: any, message: ArrayBuffer, isBinary: boolean) => {
        // Echo the message back
        ws.send(message, isBinary);
      },
      close: (ws: any, code: number) => {
        console.log(`[ws] client disconnected (code ${code})`);
      },
    });
    console.log(`[ws] WebSocket echo handler registered at ws://localhost:${PORT}/ws`);
  } else {
    console.log("[ws] uwsApp.ws not available — WebSocket echo not registered");
    console.log("[ws] Note: uwsApp is only available in worker processes, not in primary");
  }
} catch (err) {
  console.log("[ws] Could not set up WebSocket:", err);
}

console.log(`
  WebSocket echo server running on http://localhost:${PORT}

  Open http://localhost:${PORT} in a browser, or test with:
    node -e "const ws = new WebSocket('ws://localhost:${PORT}/ws'); ws.onopen = () => { ws.send('hello'); }; ws.onmessage = (e) => { console.log('echo:', e.data); ws.close(); };"
`);

setTimeout(() => {
  console.log("Auto-stopping...");
  stopServer();
}, 5_000);
