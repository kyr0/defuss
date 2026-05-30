import { join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dir, "..", "dist");
const port = Number(process.env.PORT || 8080);

const types = new Map<string, string>([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".wasm", "application/wasm"],
]);

function extname(pathname: string): string {
  const idx = pathname.lastIndexOf(".");
  return idx === -1 ? "" : pathname.slice(idx);
}

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";
    pathname = normalize(pathname).replace(/^\/+/, "").replace(/^\.+/, "");

    // Prevent path traversal: resolved path must stay inside root
    const resolved = resolve(root, pathname);
    if (!resolved.startsWith(root + "/") && resolved !== root) {
      return new Response("forbidden", { status: 403 });
    }

    if (pathname === "out.wasm") {
      const brFile = Bun.file(join(root, "out.wasm.br"));
      if (await brFile.exists()) {
        return new Response(brFile, {
          headers: {
            "content-type": "application/wasm",
            "content-encoding": "br",
            "cache-control": "no-store",
            "cross-origin-opener-policy": "same-origin",
            "cross-origin-embedder-policy": "credentialless",
          },
        });
      }
    }

    const file = Bun.file(join(root, pathname));
    if (!(await file.exists())) {
      return new Response("not found", { status: 404 });
    }

    const headers = new Headers({
      "cache-control": "no-store",
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-embedder-policy": "credentialless",
    });
    const type = types.get(extname(pathname));
    if (type) headers.set("content-type", type);
    return new Response(file, { headers });
  },
});

console.log(`serving ${root} at http://127.0.0.1:${port}`);
