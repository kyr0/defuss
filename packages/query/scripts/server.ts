#!/usr/bin/env bun
/**
 * Why: a dependency-free static file server shared by the browser tests and
 * scripts/serve.ts. It serves only files under `root` (path traversal is
 * refused), binds to loopback, maps `/` to examples/index.html, and sends
 * `Cache-Control: no-store` so iterated rebuilds are always re-fetched.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const mime: Record<string, string> = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".html": "text/html",
  ".json": "application/json",
  ".map": "application/json",
  ".css": "text/css",
};
export async function serve(root: string, port = 0) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const name =
        decodeURIComponent(url.pathname) === "/"
          ? "/examples/index.html"
          : decodeURIComponent(url.pathname);
      const path = resolve(root, "." + name);
      if (!path.startsWith(resolve(root) + sep)) {
        res.writeHead(403).end();
        return;
      }
      const data = await readFile(path);
      res
        .writeHead(200, {
          "Content-Type": mime[extname(path)] ?? "application/octet-stream",
          "Cache-Control": "no-store",
        })
        .end(data);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
  await new Promise<void>((resolve, reject) =>
    server.once("error", reject).listen(port, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("server has no address");
  return { server, url: `http://127.0.0.1:${address.port}` };
}
