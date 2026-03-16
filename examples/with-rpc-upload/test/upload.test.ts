import { describe, it, expect } from "vitest";
import { getRpcClient } from "defuss-rpc/client.js";
import { rpcBaseUrl } from "virtual:defuss-rpc";
import { uploadFile, md5 } from "../src/upload-client.js";
import type { FileUploadApi } from "../src/api/file-upload.js";

describe("Chunked File Upload via defuss-rpc", () => {
  it("should have a valid rpcBaseUrl from virtual module", () => {
    expect(rpcBaseUrl).toBeTruthy();
    expect(rpcBaseUrl).toMatch(/^http:\/\/localhost:\d+/);
  });

  it("should upload a 1MB file in 64KB chunks with MD5 verification", async () => {
    // Create a synthetic 1MB file with random-ish data
    const size = 1024 * 1024; // 1MB
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = (i * 7 + 13) & 0xff;
    }
    const file = new File([data], "test-1mb.bin", {
      type: "application/octet-stream",
    });

    const progressEvents: Array<{
      percent: number;
      status: string;
    }> = [];

    let finalProgress: Awaited<
      ReturnType<typeof uploadFile> extends AsyncGenerator<infer T> ? T : never
    > | null = null;

    for await (const progress of uploadFile(file, rpcBaseUrl, 65536)) {
      progressEvents.push({
        percent: progress.percent,
        status: progress.status,
      });
      finalProgress = progress;
    }

    // Should have progress events
    expect(progressEvents.length).toBeGreaterThan(0);

    // Final status should be confirmed
    expect(finalProgress).toBeTruthy();
    expect(finalProgress!.status).toBe("confirmed");
    expect(finalProgress!.percent).toBe(100);
    expect(finalProgress!.bytesUploaded).toBe(size);

    // MD5 hashes should match
    expect(finalProgress!.serverMd5).toBeTruthy();
    expect(finalProgress!.clientMd5).toBeTruthy();
    expect(finalProgress!.clientMd5).toBe(finalProgress!.serverMd5);

    // Should have had uploading progress events
    const uploadingEvents = progressEvents.filter(
      (e) => e.status === "uploading",
    );
    expect(uploadingEvents.length).toBeGreaterThan(1); // Multiple chunks

    // Progress should increase
    for (let i = 1; i < uploadingEvents.length; i++) {
      expect(uploadingEvents[i].percent).toBeGreaterThanOrEqual(
        uploadingEvents[i - 1].percent,
      );
    }
  });

  it("should upload a small single-chunk file", async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const file = new File([data], "tiny.bin", {
      type: "application/octet-stream",
    });

    let finalProgress: any = null;
    for await (const progress of uploadFile(file, rpcBaseUrl, 65536)) {
      finalProgress = progress;
    }

    expect(finalProgress).toBeTruthy();
    expect(finalProgress.status).toBe("confirmed");
    expect(finalProgress.percent).toBe(100);
    expect(finalProgress.bytesUploaded).toBe(8);
    expect(finalProgress.clientMd5).toBe(finalProgress.serverMd5);
  });

  it("should return error for invalid uploadId", async () => {
    const client = await getRpcClient<{ FileUploadApi: new () => FileUploadApi }>({
      baseUrl: rpcBaseUrl,
    });
    const api = new client.FileUploadApi();

    const result = await api.uploadChunk(
      "nonexistent-id",
      new Uint8Array([1, 2, 3]),
    );

    expect(result.status).toBe("error");
    expect(result.bytesWritten).toBe(0);
  });

  it("should return error when finalizing invalid uploadId", async () => {
    const client = await getRpcClient<{ FileUploadApi: new () => FileUploadApi }>({
      baseUrl: rpcBaseUrl,
    });
    const api = new client.FileUploadApi();

    const result = await api.finalizeUpload("nonexistent-id");

    expect(result).toHaveProperty("error");
  });

  it("should compute correct MD5 for known inputs", () => {
    // MD5 of empty string is d41d8cd98f00b204e9800998ecf8427e
    const empty = md5(new Uint8Array(0));
    expect(empty).toBe("d41d8cd98f00b204e9800998ecf8427e");

    // MD5 of "abc" is 900150983cd24fb0d6963f7d28e17f72
    const abc = md5(new Uint8Array([0x61, 0x62, 0x63]));
    expect(abc).toBe("900150983cd24fb0d6963f7d28e17f72");
  });
});
