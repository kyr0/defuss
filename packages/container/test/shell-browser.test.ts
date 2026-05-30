import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const ROOT = resolve(import.meta.dirname, "..");
const WASM_OUT = resolve(ROOT, "dist/out.wasm");
const PORT = 19732;
const BASE_URL = `http://127.0.0.1:${PORT}/`;

let server: ChildProcess;
let browser: Browser;

async function waitForServer(url: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

beforeAll(async () => {
  expect(existsSync(WASM_OUT), `${WASM_OUT} must exist — run "make build" first`).toBe(true);

  server = spawn("bun", [resolve(ROOT, "scripts/serve.ts")], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
    detached: true,
  });
  await waitForServer(BASE_URL);

  // Use real Chrome (not chromium-headless-shell) — Workers + SharedArrayBuffer
  // + canvas pty require a full browser engine.
  const t0 = performance.now();
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const launchMs = performance.now() - t0;
  console.log(`\n  Playwright Chrome launch overhead: ${(launchMs / 1000).toFixed(3)}s`);
}, 60_000);

afterAll(async () => {
  await browser?.close();
  if (server?.pid) {
    try { process.kill(-server.pid, "SIGTERM"); } catch {}
  }
});

describe("shell:browser", () => {
  it("boots to a shell prompt within 3 s", async () => {
    const page = await browser.newPage();
    page.on("pageerror", (err) => console.log(`  [browser error] ${err.message}`));

    const t0 = performance.now();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    // Wait for window.term (xterm instance exposed via index.html)
    await page.waitForFunction(() => !!(window as any).term, undefined, {
      timeout: 3_000,
      polling: 50,
    });

    // Poll xterm buffer for BusyBox shell prompt ("~ #" or "/ #")
    await page.waitForFunction(
      () => {
        const term = (window as any).term;
        if (!term?.buffer?.active) return false;
        const buf = term.buffer.active;
        for (let i = 0; i <= buf.cursorY; i++) {
          const line = buf.getLine(i)?.translateToString(true) ?? "";
          if (/(\/|~)\s*#\s*$/.test(line)) return true;
        }
        return false;
      },
      undefined,
      { timeout: 3_000, polling: 100 },
    );

    const bootMs = performance.now() - t0;
    console.log(`  Browser WASM boot → shell prompt: ${(bootMs / 1000).toFixed(3)}s`);
    expect(bootMs).toBeLessThan(3_000);

    await page.evaluate(() => (window as any).term.writeln("exit"));
    await page.close();
  });
});
