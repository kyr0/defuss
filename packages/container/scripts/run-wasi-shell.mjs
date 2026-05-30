import { spawn } from "node:child_process";
import { resolve } from "node:path";

const wasmPath = resolve(process.argv[2] ?? "dist/out.wasm");
const userArgs = process.argv.slice(3);

const child = spawn(process.execPath, ["./scripts/run-wasi.mjs", wasmPath, ...userArgs], {
  cwd: process.cwd(),
  stdio: ["pipe", "pipe", "pipe"],
  env: process.env,
});

let stdinBuffer = "";
let closingForExit = false;

process.stdin.setEncoding("utf8");
process.stdin.resume();

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
});

process.stdin.on("data", (chunk) => {
  if (!child.stdin.writable) {
    return;
  }

  child.stdin.write(chunk);
  stdinBuffer += chunk;
  const lines = stdinBuffer.split(/\r\n|\n|\r/);
  stdinBuffer = lines.pop() ?? "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "exit" || trimmed === "logout") {
      closingForExit = true;
    }
  }

  if (closingForExit) {
    child.stdin.end();
  }
});

process.stdin.on("end", () => {
  if (child.stdin.writable) {
    child.stdin.end();
  }
});

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("close", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});