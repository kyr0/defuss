/**
 * Integration tests for defuss-express.
 *
 * Spawns the test server as a child process (which forks workers internally)
 * and exercises HTTP endpoints, file delivery, SSE, JWT auth, and file upload.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createAuth, genEd25519Pair } from "defuss-jwt";

const PORT = Number(process.env.TEST_PORT ?? 4444);
const BASE = `http://localhost:${PORT}`;

const isWindows = process.platform === "win32";

/** Resolve the absolute path to `node` so spawn works even when PATH is incomplete. */
function resolveNode(): string {
  try {
    const cmd = isWindows ? "where node" : "which node";
    // `where` may return multiple lines on Windows; take the first one.
    return execSync(cmd, { encoding: "utf8" }).trim().split(/\r?\n/)[0];
  } catch {
    return "node"; // fallback to bare name
  }
}

let server: ChildProcess;

function startTestServer(): Promise<ChildProcess> {
  const cwd = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  return new Promise((resolve, reject) => {
    const child = spawn(
      resolveNode(),
      ["--import", "tsx", "test/fixtures/test-server.ts"],
      {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, TEST_PORT: String(PORT) },
      },
    );

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("Test server did not start within 15s"));
        child.kill("SIGTERM");
      }
    }, 15_000);

    child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      if (!resolved && text.includes("server ready")) {
        resolved = true;
        clearTimeout(timeout);
        resolve(child);
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      if (text.includes("Error")) {
        console.error("[test-server stderr]", text);
      }
    });

    child.once("exit", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`Test server exited with code ${code}`));
      }
    });
  });
}

async function waitForHealthy(maxMs = 10_000): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Test server did not become healthy");
}

beforeAll(async () => {
  server = await startTestServer();
  await waitForHealthy();
}, 20_000);

afterAll(async () => {
  server?.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 500));
});

// Health check
describe("health check", () => {
  it("responds with ok", async () => {
    const res = await fetch(`${BASE}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.pid).toBeTypeOf("number");
  });
});

// File delivery
describe("file delivery", () => {
  it("serves a file inline with cache-control", async () => {
    const res = await fetch(`${BASE}/file/inline`);
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toContain("Hello from defuss-express test fixture");

    const cacheControl = res.headers.get("cache-control");
    expect(cacheControl).toContain("max-age=3600");
  });

  it("serves a file as download with content-disposition", async () => {
    const res = await fetch(`${BASE}/file/download`);
    expect(res.status).toBe(200);

    const disposition = res.headers.get("content-disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("sample-download.txt");

    const text = await res.text();
    expect(text).toContain("Hello from defuss-express test fixture");
  });

  it("serves a file with no-cache headers", async () => {
    const res = await fetch(`${BASE}/file/no-cache`);
    expect(res.status).toBe(200);

    const cacheControl = res.headers.get("cache-control");
    expect(cacheControl).toContain("no-store");
    expect(cacheControl).toContain("no-cache");

    const text = await res.text();
    expect(text).toContain("Hello from defuss-express test fixture");
  });
});

// File upload
describe("file upload", () => {
  it("accepts a binary upload and reports correct size", async () => {
    const payload = Buffer.alloc(1024, 0xab);
    const res = await fetch(`${BASE}/upload`, {
      method: "POST",
      headers: { "Content-Length": String(payload.length) },
      body: payload,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(1024);
    expect(body.match).toBe(true);
  });

  it("handles a larger upload", async () => {
    const payload = Buffer.alloc(64 * 1024, 0xcd);
    const res = await fetch(`${BASE}/upload`, {
      method: "POST",
      headers: { "Content-Length": String(payload.length) },
      body: payload,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(64 * 1024);
  });

  it("handles empty upload", async () => {
    const res = await fetch(`${BASE}/upload`, {
      method: "POST",
      headers: { "Content-Length": "0" },
      body: "",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(0);
  });
});

// Server-Sent Events
describe("server-sent events", () => {
  it("streams multiple events then closes", async () => {
    const res = await fetch(`${BASE}/sse`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const text = await res.text();
    const events = text
      .split("\n\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => JSON.parse(line.replace("data: ", "")));

    expect(events.length).toBe(3);
    expect(events[0].count).toBe(1);
    expect(events[1].count).toBe(2);
    expect(events[2].count).toBe(3);
    expect(events[2].ts).toBeGreaterThanOrEqual(events[0].ts);
  });
});

// JWT / Bearer token auth
describe("bearer token auth", () => {
  it("rejects requests without Authorization header", async () => {
    const res = await fetch(`${BASE}/protected`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Missing");
  });

  it("rejects requests with malformed Authorization header", async () => {
    const res = await fetch(`${BASE}/protected`, {
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(res.status).toBe(401);
  });

  it("accepts a valid Bearer token (minted with defuss-jwt)", async () => {
    const keys = await genEd25519Pair();
    const storage = new Map<string, { id: string; revoked?: boolean }>();
    const auth = createAuth(keys, {
      storage: {
        getTokenFromStorage: (id) => storage.get(id),
        setTokenToStorage: (record) => { storage.set(record.id, record); },
      },
    });

    const { token, jti } = await auth.issueToken({ sub: "test-user", ttlSec: 60 });
    expect(token).toBeTypeOf("string");
    expect(token.split(".").length).toBe(3);

    const res = await fetch(`${BASE}/protected`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.tokenReceived).toBe(true);

    const validated = await auth.validateToken(token);
    expect(validated.sub).toBe("test-user");
    expect(validated.jti).toBe(jti);

    await auth.revokeToken(jti);
    await expect(auth.validateToken(token)).rejects.toThrow("Token revoked");
  });

  it("server-side token verification endpoint accepts valid token", async () => {
    const keys = await genEd25519Pair();
    const storage = new Map<string, { id: string; revoked?: boolean }>();
    const auth = createAuth(keys, {
      storage: {
        getTokenFromStorage: (id) => storage.get(id),
        setTokenToStorage: (record) => { storage.set(record.id, record); },
      },
    });

    const { token } = await auth.issueToken({ sub: "api-client", ttlSec: 300 });

    const res = await fetch(`${BASE}/verify-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, publicJwk: keys.publicJwk, kid: keys.kid }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.hasToken).toBe(true);
  });
});
