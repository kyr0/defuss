/**
 * File upload example for defuss-express with progress reporting.
 *
 * Demonstrates:
 *   - Streaming file upload with chunked progress
 *   - Content-Length based progress percentage
 *   - Upload result with byte count verification
 */
import { express, startServer, stopServer } from "../src/index.js";

const PORT = 3000;

const app = express({ threads: 0 });
app.disable?.("x-powered-by");

app.post?.("/upload", (req: any, res: any) => {
  const chunks: Buffer[] = [];
  let received = 0;
  const total = Number(req.headers["content-length"] ?? 0);

  req.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
    received += chunk.length;
    if (total > 0) {
      const pct = ((received / total) * 100).toFixed(1);
      console.log(`[upload] progress: ${received}/${total} bytes (${pct}%)`);
    }
  });

  req.on("end", () => {
    const body = Buffer.concat(chunks);
    console.log(`[upload] complete: ${body.length} bytes received`);
    res.status(200).json({
      ok: true,
      received: body.length,
      expectedLength: total,
      match: body.length === total,
    });
  });
});

// Upload form page
app.get?.("/", (_req: any, res: any) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
<head><title>File Upload</title></head>
<body>
  <h1>File Upload with Progress</h1>
  <input type="file" id="file" />
  <button onclick="upload()">Upload</button>
  <progress id="progress" value="0" max="100" style="width:300px"></progress>
  <pre id="log"></pre>
  <script>
    async function upload() {
      const file = document.getElementById("file").files[0];
      if (!file) return alert("Pick a file first");
      const log = document.getElementById("log");
      const progress = document.getElementById("progress");

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = (e.loaded / e.total * 100).toFixed(1);
          progress.value = pct;
          log.textContent = "Uploading: " + pct + "%\\n";
        }
      };
      xhr.onload = () => {
        log.textContent += "Done: " + xhr.responseText + "\\n";
        progress.value = 100;
      };
      xhr.open("POST", "/upload");
      xhr.send(file);
    }
  </script>
</body>
</html>`);
});

app.get?.("/health", (_req: any, res: any) => {
  res.status(200).json({ ok: true, pid: process.pid });
});

await startServer(app, { port: PORT, workers: "auto" });

console.log(`
  File upload example running on http://localhost:${PORT}

  Browser: open http://localhost:${PORT} and pick a file
  CLI:     curl -X POST --data-binary @somefile.bin http://localhost:${PORT}/upload
`);

setTimeout(() => {
  console.log("Auto-stopping...");
  stopServer();
}, 5_000);
