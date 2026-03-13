/**
 * File delivery example for defuss-express.
 *
 * Demonstrates:
 *   - Inline file serving with cache-control
 *   - File download with content-disposition: attachment
 *   - No-cache file delivery
 *   - express.static() for a public directory
 */
import { join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { express, startServer, stopServer } from "../src/index.js";

const PORT = 3000;

// Create a temp public directory with a sample file
const publicDir = join(import.meta.dirname, "../.tmp-public");
mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, "hello.txt"), "Hello from express.static()!\n");
writeFileSync(join(publicDir, "data.json"), JSON.stringify({ message: "served statically" }));

const app = express({ threads: 0 });
app.disable?.("x-powered-by");

// Static file serving (optimised in ultimate-express)
app.use?.(express.static?.(publicDir));

// Inline file with cache headers
app.get?.("/file/inline", (_req: any, res: any) => {
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "public, max-age=3600, immutable");
  res.sendFile(join(publicDir, "hello.txt"));
});

// Download with content-disposition: attachment
app.get?.("/file/download", (_req: any, res: any) => {
  res.download(join(publicDir, "data.json"), "my-data.json");
});

// No-cache delivery
app.get?.("/file/fresh", (_req: any, res: any) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.sendFile(join(publicDir, "hello.txt"));
});

app.get?.("/health", (_req: any, res: any) => {
  res.status(200).json({ ok: true, pid: process.pid });
});

await startServer(app, { port: PORT, workers: "auto" });

console.log(`
  File delivery example running on http://localhost:${PORT}

  Try:
    curl http://localhost:${PORT}/hello.txt           # express.static()
    curl -v http://localhost:${PORT}/file/inline       # inline with cache-control
    curl -v http://localhost:${PORT}/file/download      # content-disposition: attachment
    curl -v http://localhost:${PORT}/file/fresh         # no-cache headers
`);

setTimeout(() => {
  console.log("Auto-stopping...");
  stopServer();
}, 3_000);
