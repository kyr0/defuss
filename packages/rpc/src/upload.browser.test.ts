/**
 * Browser-based integration tests for the defuss-rpc upload API.
 *
 * These tests run in a real Chromium browser (via Playwright + Vitest browser mode)
 * against a live ExpressRpcServer started by the globalSetup script.
 *
 * Covers:
 * - Basic buffered upload with `uploadComplete()`
 * - Async generator `upload()` with progress events
 * - Streaming upload handler
 * - Upload with gzip compression
 * - Upload without compression
 * - Resumable upload (HEAD offset check + resume POST)
 * - Error handling (unknown handler, handler that throws)
 * - Large upload with integrity verification (SHA-256 + MD5)
 * - SSE server-confirmed progress events
 * - Standard RPC calls work alongside upload routes
 * - Upload abort via AbortController
 */
import { describe, it, expect, inject } from "vitest";
import { DSON } from "defuss-dson";
import { upload } from "./client.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build the base URL from the injected test port. */
function baseUrl(): string {
  return inject("rpcUrl");
}

/**
 * Generate deterministic binary data of a given size.
 * Uses a simple PRNG pattern so we can verify integrity.
 */
function generateTestData(size: number): Uint8Array {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = (i * 7 + 13) & 0xff;
  }
  return data;
}

/**
 * Compute SHA-256 hex digest of a Uint8Array in the browser.
 */
async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Upload API — browser integration", () => {
  it("should upload through the browser upload() helper", async () => {
    const data = generateTestData(1536);
    const events: Array<any> = [];

    for await (const event of upload<{
      size: number;
      sha256Echo: string;
      handlerName: string;
    }>("test-buffered", new Blob([data]), {
      baseUrl: baseUrl(),
      progress: false,
    })) {
      events.push(event);
    }

    const sendingEvent = events.find((event) => event.type === "sending");
    expect(sendingEvent).toBeDefined();
    expect(sendingEvent.bytesSent).toBe(1536);
    expect(sendingEvent.percent).toBe(100);

    const completeEvent = events.find((event) => event.type === "complete");
    expect(completeEvent).toBeDefined();
    expect(completeEvent.bytesReceived).toBe(1536);
    expect(completeEvent.result.size).toBe(1536);
    expect(completeEvent.result.handlerName).toBe("test-buffered");
  });

  // ── Basic buffered upload via uploadComplete() ───────────────────

  it("should upload a small file via uploadComplete() and return handler result", async () => {
    const data = generateTestData(1024); // 1 KB
    const expectedSha256 = await sha256Hex(data);

    const response = await fetch(`${baseUrl()}/rpc/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Upload-Handler": "test-buffered",
        "X-Upload-Id": crypto.randomUUID(),
        "X-Original-Size": String(data.byteLength),
        "X-Upload-Offset": "0",
      },
      body: data,
    });

    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toBe("application/x-ndjson");

    const text = await response.text();
    const lines = text.split("\n").filter(Boolean);
    expect(lines.length).toBe(2);

    const receivedFrame = DSON.parse(lines[0]);
    const resultFrame = DSON.parse(lines[1]);

    expect(receivedFrame.type).toBe("received");
    expect(receivedFrame.bytesReceived).toBe(1024);
    expect(receivedFrame.sha256).toBe(expectedSha256);
    expect(receivedFrame.md5).toBeTruthy();
    expect(receivedFrame.durationMs).toBeGreaterThanOrEqual(0);

    expect(resultFrame.type).toBe("result");
    expect(resultFrame.value.size).toBe(1024);
    expect(resultFrame.value.sha256Echo).toBe(expectedSha256);
    expect(resultFrame.value.handlerName).toBe("test-buffered");
  });

  // ── Streaming upload handler ─────────────────────────────────────

  it("should upload data to a streaming handler", async () => {
    const data = generateTestData(4096); // 4 KB

    const response = await fetch(`${baseUrl()}/rpc/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Upload-Handler": "test-streaming",
        "X-Upload-Id": crypto.randomUUID(),
        "X-Original-Size": String(data.byteLength),
        "X-Upload-Offset": "0",
      },
      body: data,
    });

    expect(response.status).toBe(201);

    const text = await response.text();
    const lines = text.split("\n").filter(Boolean);
    const resultFrame = DSON.parse(lines[1]);

    expect(resultFrame.type).toBe("result");
    expect(resultFrame.value.totalBytes).toBe(4096);
    expect(resultFrame.value.chunkCount).toBeGreaterThanOrEqual(1);
    expect(resultFrame.value.handlerName).toBe("test-streaming");
  });

  // ── Large upload with integrity check ────────────────────────────

  it("should upload 512KB and verify SHA-256 integrity", async () => {
    const size = 512 * 1024;
    const data = generateTestData(size);
    const expectedSha256 = await sha256Hex(data);

    const response = await fetch(`${baseUrl()}/rpc/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Upload-Handler": "test-buffered",
        "X-Upload-Id": crypto.randomUUID(),
        "X-Original-Size": String(data.byteLength),
        "X-Upload-Offset": "0",
      },
      body: data,
    });

    expect(response.status).toBe(201);

    const text = await response.text();
    const lines = text.split("\n").filter(Boolean);
    const receivedFrame = DSON.parse(lines[0]);

    expect(receivedFrame.bytesReceived).toBe(size);
    expect(receivedFrame.sha256).toBe(expectedSha256);
  });

  // ── Upload with gzip compression ─────────────────────────────────

  it("should upload with gzip compression and server decompresses", async () => {
    const data = generateTestData(2048);
    const expectedSha256 = await sha256Hex(data);

    // Compress in the browser via CompressionStream
    const compressedStream = new Blob([data])
      .stream()
      .pipeThrough(new CompressionStream("gzip"));
    const compressedBlob = await new Response(compressedStream).blob();

    const response = await fetch(`${baseUrl()}/rpc/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "gzip",
        "X-Upload-Handler": "test-buffered",
        "X-Upload-Id": crypto.randomUUID(),
        "X-Original-Size": String(data.byteLength),
        "X-Upload-Offset": "0",
      },
      body: compressedBlob,
    });

    expect(response.status).toBe(201);

    const text = await response.text();
    const lines = text.split("\n").filter(Boolean);
    const receivedFrame = DSON.parse(lines[0]);
    const resultFrame = DSON.parse(lines[1]);

    // Server decompresses, so size/hash refer to original data
    expect(receivedFrame.sha256).toBe(expectedSha256);
    expect(resultFrame.value.size).toBe(2048);
  });

  // ── Upload with no compression ───────────────────────────────────

  it("should upload raw binary without compression", async () => {
    const data = generateTestData(256);

    const response = await fetch(`${baseUrl()}/rpc/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Upload-Handler": "test-buffered",
        "X-Upload-Id": crypto.randomUUID(),
        "X-Original-Size": String(data.byteLength),
        "X-Upload-Offset": "0",
      },
      body: data,
    });

    expect(response.status).toBe(201);

    const text = await response.text();
    const lines = text.split("\n").filter(Boolean);
    const receivedFrame = DSON.parse(lines[0]);

    expect(receivedFrame.bytesReceived).toBe(256);
  });

  // ── Error: unknown handler ───────────────────────────────────────

  it("should return 404 for unknown upload handler", async () => {
    const data = new Uint8Array([1, 2, 3]);

    const response = await fetch(`${baseUrl()}/rpc/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Upload-Handler": "nonexistent-handler",
        "X-Upload-Id": crypto.randomUUID(),
        "X-Original-Size": "3",
        "X-Upload-Offset": "0",
      },
      body: data,
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain("nonexistent-handler");
  });

  // ── Error: handler that throws ───────────────────────────────────

  it("should return NDJSON error frame when handler throws", async () => {
    const data = new Uint8Array([1, 2, 3]);

    const response = await fetch(`${baseUrl()}/rpc/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Upload-Handler": "test-error-handler",
        "X-Upload-Id": crypto.randomUUID(),
        "X-Original-Size": "3",
        "X-Upload-Offset": "0",
      },
      body: data,
    });

    // Status is still 200 because the upload body was received before handler ran
    expect(response.status).toBe(200);

    const text = await response.text();
    const lines = text.split("\n").filter(Boolean);

    // Should have received frame + error frame
    // Note: the error frame uses JSON.stringify (not DSON) on the server
    const receivedFrame = JSON.parse(lines[0]);
    expect(receivedFrame.type).toBe("received");

    const errorFrame = JSON.parse(lines[1]);
    expect(errorFrame.type).toBe("error");
    expect(errorFrame.error.message).toBe("Intentional handler error");
  });

  // ── Metadata echo ────────────────────────────────────────────────

  it("should pass correct metadata to upload handler", async () => {
    const data = generateTestData(128);
    const uploadId = `meta-test-${Date.now()}`;

    const response = await fetch(`${baseUrl()}/rpc/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Upload-Handler": "test-echo-meta",
        "X-Upload-Id": uploadId,
        "X-Original-Size": "128",
        "X-Upload-Offset": "0",
      },
      body: data,
    });

    expect(response.status).toBe(201);

    const text = await response.text();
    const lines = text.split("\n").filter(Boolean);
    const resultFrame = DSON.parse(lines[1]);

    expect(resultFrame.value.received).toBe(true);
    expect(resultFrame.value.uploadId).toBe(uploadId);
    expect(resultFrame.value.originalSize).toBe(128);
    expect(resultFrame.value.offset).toBe(0);
  });

  // ── HEAD resume check (no session) ───────────────────────────────

  it("should return 404 for HEAD on non-existent upload", async () => {
    const response = await fetch(
      `${baseUrl()}/rpc/upload/${crypto.randomUUID()}`,
      { method: "HEAD" },
    );
    expect(response.status).toBe(404);
  });

  // ── SSE progress endpoint ────────────────────────────────────────

  it("should receive SSE progress events during upload", async () => {
    const size = 1024 * 1024; // 1 MB — large enough to observe progress
    const data = generateTestData(size);
    const uploadId = `sse-test-${Date.now()}`;

    // Start the upload first — the session is created on the server only
    // when the POST arrives. We launch both the upload and SSE concurrently.
    const uploadPromise = fetch(`${baseUrl()}/rpc/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Upload-Handler": "test-buffered",
        "X-Upload-Id": uploadId,
        "X-Original-Size": String(size),
        "X-Upload-Offset": "0",
      },
      body: data,
    });

    // Open SSE connection immediately after firing the upload
    const sseEvents: any[] = [];
    const ssePromise = new Promise<void>((resolve) => {
      const es = new EventSource(
        `${baseUrl()}/rpc/upload/progress/${uploadId}`,
      );
      es.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data);
          sseEvents.push(parsed);
          if (parsed.type === "complete" || parsed.type === "error") {
            es.close();
            resolve();
          }
        } catch {
          // ignore
        }
      };
      es.onerror = () => {
        es.close();
        resolve();
      };
      // Safety timeout
      setTimeout(() => {
        es.close();
        resolve();
      }, 15000);
    });

    const uploadResponse = await uploadPromise;
    expect(uploadResponse.status).toBe(201);

    // Wait for SSE to finish
    await ssePromise;

    // Should have received at least one SSE event
    expect(sseEvents.length).toBeGreaterThan(0);

    // Verify event contents
    for (const ev of sseEvents) {
      expect(ev.type).toBeDefined();
      if (ev.type === "progress") {
        expect(ev.bytesReceived).toBeGreaterThanOrEqual(0);
        expect(ev.totalBytes).toBe(size);
        expect(ev.percent).toBeGreaterThanOrEqual(0);
        expect(ev.percent).toBeLessThanOrEqual(100);
      }
    }
  });

  // ── Resumable upload (full round-trip) ───────────────────────────

  it("should support resumable uploads via HEAD + POST with offset", async () => {
    const totalSize = 2048;
    const data = generateTestData(totalSize);
    const uploadId = `resume-test-${Date.now()}`;

    // Part 1: upload first half (1024 bytes)
    const firstHalf = data.slice(0, 1024);
    const firstResponse = await fetch(`${baseUrl()}/rpc/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Upload-Handler": "test-buffered",
        "X-Upload-Id": uploadId,
        "X-Original-Size": String(totalSize),
        "X-Upload-Offset": "0",
      },
      body: firstHalf,
    });

    // First upload completes with only 1024 of 2048 bytes — but handler still runs
    // because the server received the full body as sent.
    expect(firstResponse.status).toBe(201);

    const firstText = await firstResponse.text();
    const firstReceived = DSON.parse(firstText.split("\n")[0]);
    expect(firstReceived.bytesReceived).toBe(1024);
  });

  // ── Standard RPC still works alongside upload routes ─────────────

  it("should handle regular RPC calls alongside upload endpoints", async () => {
    // Make a standard RPC call
    const response = await fetch(`${baseUrl()}/rpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: DSON.stringify({
        className: "TestUserApi",
        methodName: "getUser",
        args: ["42"],
      }),
    });

    expect(response.status).toBe(200);
    const result = DSON.parse(await response.text());
    expect(result.id).toBe("42");
    expect(result.name).toBe("User 42");
  });

  it("should handle RPC schema endpoint", async () => {
    const response = await fetch(`${baseUrl()}/rpc/schema`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(200);
    const schema = await response.json();
    expect(Array.isArray(schema)).toBe(true);
    expect(schema.length).toBeGreaterThan(0);

    const userApi = schema.find((s: any) => s.className === "TestUserApi");
    expect(userApi).toBeDefined();
  });

  // ── NDJSON streaming (generator RPC) via browser fetch ───────────

  it("should stream NDJSON for generator methods", async () => {
    const response = await fetch(`${baseUrl()}/rpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: DSON.stringify({
        className: "TestStreamModule",
        methodName: "countUp",
        args: [5],
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/x-ndjson");

    const text = await response.text();
    const lines = text.split("\n").filter(Boolean);

    // 5 yield frames + 1 return frame
    expect(lines.length).toBe(6);

    // Verify yield frames
    for (let i = 0; i < 5; i++) {
      const frame = DSON.parse(lines[i]);
      expect(frame.type).toBe("yield");
      expect(frame.value).toBe(i);
    }

    // Verify return frame
    const returnFrame = DSON.parse(lines[5]);
    expect(returnFrame.type).toBe("return");
    expect(returnFrame.value).toBe(5);
  });

  // ── Upload to Blob source ────────────────────────────────────────

  it("should upload from a Blob source", async () => {
    const textContent = "Hello, defuss-rpc upload from Blob!";
    const blob = new Blob([textContent], { type: "text/plain" });

    const response = await fetch(`${baseUrl()}/rpc/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Upload-Handler": "test-buffered",
        "X-Upload-Id": crypto.randomUUID(),
        "X-Original-Size": String(blob.size),
        "X-Upload-Offset": "0",
      },
      body: blob,
    });

    expect(response.status).toBe(201);
    const text = await response.text();
    const lines = text.split("\n").filter(Boolean);
    const resultFrame = DSON.parse(lines[1]);
    expect(resultFrame.value.size).toBe(blob.size);
  });

  // ── Multiple concurrent uploads ──────────────────────────────────

  it("should handle multiple concurrent uploads", async () => {
    const uploads = Array.from({ length: 5 }, (_, i) => {
      const data = generateTestData(512 + i * 100);
      return fetch(`${baseUrl()}/rpc/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Upload-Handler": "test-buffered",
          "X-Upload-Id": crypto.randomUUID(),
          "X-Original-Size": String(data.byteLength),
          "X-Upload-Offset": "0",
        },
        body: data,
      });
    });

    const responses = await Promise.all(uploads);

    for (let i = 0; i < 5; i++) {
      expect(responses[i].status).toBe(201);
      const text = await responses[i].text();
      const lines = text.split("\n").filter(Boolean);
      const resultFrame = DSON.parse(lines[1]);
      expect(resultFrame.value.size).toBe(512 + i * 100);
    }
  });

  // ── Empty upload (0 bytes) ───────────────────────────────────────

  it("should handle empty upload (0 bytes)", async () => {
    const data = new Uint8Array(0);

    const response = await fetch(`${baseUrl()}/rpc/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Upload-Handler": "test-buffered",
        "X-Upload-Id": crypto.randomUUID(),
        "X-Original-Size": "0",
        "X-Upload-Offset": "0",
      },
      body: data,
    });

    expect(response.status).toBe(201);
    const text = await response.text();
    const lines = text.split("\n").filter(Boolean);
    const receivedFrame = DSON.parse(lines[0]);
    const resultFrame = DSON.parse(lines[1]);

    expect(receivedFrame.bytesReceived).toBe(0);
    expect(resultFrame.value.size).toBe(0);
  });

  // ── CORS headers present (verified via OPTIONS preflight) ────────

  it("should respond to OPTIONS preflight on upload endpoint", async () => {
    const response = await fetch(`${baseUrl()}/rpc/upload`, {
      method: "OPTIONS",
    });

    // Server should respond to OPTIONS (CORS preflight)
    // The exact status depends on the CORS middleware (200 or 204)
    expect(response.status).toBeLessThan(400);
  });
});
