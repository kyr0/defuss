import { describe, it, expect } from "vitest";
import { rpcBaseUrl } from "virtual:defuss-rpc";
import { uploadFile, uploadFileComplete } from "../src/upload-client.js";

describe("File Upload via defuss-rpc upload API", () => {
  it("should have a valid rpcBaseUrl from virtual module", () => {
    expect(rpcBaseUrl).toBeTruthy();
    expect(rpcBaseUrl).toMatch(/^http:\/\/localhost:\d+/);
  });

  it("should upload a 1MB file with progress events and hash verification", async () => {
    const size = 1024 * 1024; // 1 MB
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = (i * 7 + 13) & 0xff;
    }
    const file = new File([data], "test-1mb.bin", {
      type: "application/octet-stream",
    });

    const events: Array<{ type: string; percent?: number }> = [];
    let complete: any = null;

    for await (const event of uploadFile(file, rpcBaseUrl)) {
      events.push({ type: event.type, percent: "percent" in event ? event.percent : undefined });
      if (event.type === "complete") {
        complete = event;
      }
    }

    // Should have progress events
    expect(events.length).toBeGreaterThan(0);

    // Final event should be complete
    expect(complete).toBeTruthy();
    expect(complete.bytesReceived).toBe(size);

    // Server should return hashes
    expect(complete.sha256).toBeTruthy();
    expect(complete.md5).toBeTruthy();

    // Handler result should contain our custom fields
    expect(complete.result.size).toBe(size);
    expect(complete.result.sha256).toBe(complete.sha256);
    expect(complete.result.md5).toBe(complete.md5);

    // Should have had sending progress events
    const sendingEvents = events.filter((e) => e.type === "sending");
    expect(sendingEvents.length).toBeGreaterThan(1); // Multiple chunks
  });

  it("should upload a small file via uploadComplete()", async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const file = new File([data], "tiny.bin", {
      type: "application/octet-stream",
    });

    const result = await uploadFileComplete(file, rpcBaseUrl);

    expect(result.bytesReceived).toBe(8);
    expect(result.sha256).toBeTruthy();
    expect(result.md5).toBeTruthy();
    expect(result.result.size).toBe(8);
    expect(result.result.uploadId).toBeTruthy();
  });

  it("should fail for an unregistered handler", async () => {
    const data = new Uint8Array([1, 2, 3]);
    const file = new File([data], "test.bin");

    await expect(
      // Use uploadComplete directly to verify handler-not-found errors are surfaced.
      import("defuss-rpc/client.js").then(({ uploadComplete }) =>
        uploadComplete("nonexistent-handler", file, {
          baseUrl: rpcBaseUrl,
          compression: "none",
        }),
      ),
    ).rejects.toThrow();
  });
});
