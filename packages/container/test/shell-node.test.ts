import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const ROOT = resolve(import.meta.dirname, "..");
const WASM_OUT = resolve(ROOT, "dist/out.wasm");

describe("shell:node", () => {
  it("boots and exits within 30 s", async () => {
    expect(existsSync(WASM_OUT), `${WASM_OUT} must exist — run "make build" first`).toBe(true);

    const t0 = performance.now();

    const exitCode = await new Promise<number>((res, rej) => {
      const child = spawn(
        "node",
        [resolve(ROOT, "scripts/run-wasi-shell.mjs"), WASM_OUT],
        { cwd: ROOT, stdio: ["pipe", "pipe", "pipe"] },
      );

      // Collect stderr for diagnostics on failure
      let stderr = "";
      child.stderr.on("data", (c) => { stderr += c; });

      child.on("error", rej);
      child.on("close", (code) => res(code ?? 1));

      // Feed "exit" once we see any stdout (shell prompt appeared)
      child.stdout.once("data", () => {
        child.stdin.write("exit\n");
        child.stdin.end();
      });

      // Safety timeout — kill after 30 s
      setTimeout(() => {
        child.kill("SIGKILL");
        rej(new Error(`Node WASI shell did not exit within 30 s.\nstderr: ${stderr}`));
      }, 30_000);
    });

    const ms = performance.now() - t0;
    console.log(`\n  Node WASI boot → exit: ${(ms / 1000).toFixed(3)}s`);

    expect(exitCode).toBe(0);
    expect(ms).toBeLessThan(30_000);
  });
});
