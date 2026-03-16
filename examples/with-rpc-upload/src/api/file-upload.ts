import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, rmSync, existsSync } from "node:fs";

/** Tracks the state of a single chunked file upload. */
export interface UploadSession {
  uploadId: string;
  fileName: string;
  totalSize: number;
  tempDir: string;
  tempFile: string;
  bytesWritten: number;
  chunksReceived: number;
  finalized: boolean;
}

/** In-memory registry of active upload sessions, keyed by upload ID. */
const uploads = new Map<string, UploadSession>();

/**
 * Server-side RPC API for chunked file uploads with MD5 integrity verification.
 *
 * Upload flow:
 * 1. {@link startUpload} — create a session and temp file
 * 2. {@link uploadChunk} — append binary chunks (call repeatedly)
 * 3. {@link finalizeUpload} — compute the server-side MD5 hash
 * 4. {@link confirmIntegrity} — client confirms whether its own MD5 matches
 */
export class FileUploadApi {
  /**
   * Create a new upload session and allocate a temporary file on disk.
   *
   * @param fileName - Original name of the file being uploaded.
   * @param totalSize - Expected total size in bytes (informational).
   * @returns An object containing the unique `uploadId` for subsequent calls.
   */
  async startUpload(fileName: string, totalSize: number): Promise<{ uploadId: string }> {
    const uploadId = randomUUID();
    const tempDir = join(tmpdir(), `defuss-upload-${uploadId}`);
    const tempFile = join(tempDir, fileName);

    mkdirSync(tempDir, { recursive: true });
    writeFileSync(tempFile, Buffer.alloc(0));

    uploads.set(uploadId, {
      uploadId,
      fileName,
      totalSize,
      tempDir,
      tempFile,
      bytesWritten: 0,
      chunksReceived: 0,
      finalized: false,
    });

    return { uploadId };
  }

  /**
   * Append a chunk of binary data to the upload's temporary file.
   *
   * Chunks are appended sequentially in the order they are received.
   * DSON preserves `Uint8Array` across the RPC boundary.
   *
   * @param uploadId - Session ID returned by {@link startUpload}.
   * @param data - Chunk bytes as a Uint8Array.
   * @returns Status and cumulative bytes written so far.
   */
  async uploadChunk(
    uploadId: string,
    data: Uint8Array,
  ): Promise<{ status: "ok" | "error"; bytesWritten: number }> {
    const session = uploads.get(uploadId);
    if (!session) {
      return { status: "error", bytesWritten: 0 };
    }

    if (session.finalized) {
      return { status: "error", bytesWritten: session.bytesWritten };
    }

    appendFileSync(session.tempFile, data);
    session.bytesWritten += data.byteLength;
    session.chunksReceived++;

    const percent = session.totalSize > 0
      ? Math.round((session.bytesWritten / session.totalSize) * 100)
      : 0;
    console.log(
      `[defuss-rpc] uploadChunk #${session.chunksReceived} for "${session.fileName}": ${session.bytesWritten}/${session.totalSize} bytes (${percent}%)`,
    );

    return { status: "ok", bytesWritten: session.bytesWritten };
  }

  /**
   * Mark the upload as complete and compute the server-side MD5 hash of the
   * reassembled file.
   *
   * After this call, no more chunks can be appended.
   *
   * @param uploadId - Session ID returned by {@link startUpload}.
   * @returns The hex-encoded MD5 digest, or an error object.
   */
  async finalizeUpload(uploadId: string): Promise<{ serverMd5: string } | { error: string }> {
    const session = uploads.get(uploadId);
    if (!session) {
      return { error: `Upload session ${uploadId} not found` };
    }

    if (session.finalized) {
      return { error: "Upload already finalized" };
    }

    session.finalized = true;

    const fileBuffer = readFileSync(session.tempFile);
    const hash = createHash("md5");
    hash.update(fileBuffer);
    const serverMd5 = hash.digest("hex");

    return { serverMd5 };
  }

  /**
   * Confirm or reject the upload based on the client's independent MD5 comparison.
   *
   * The client never sends its MD5 to the server — only a boolean indicating
   * whether its locally-computed hash matches the server's hash.
   * Temporary files are cleaned up regardless of the outcome.
   *
   * @param uploadId - Session ID returned by {@link startUpload}.
   * @param isValid - `true` if the client's MD5 matches the server's MD5.
   * @returns Confirmation status: `"confirmed"` or `"rejected"`.
   */
  async confirmIntegrity(
    uploadId: string,
    isValid: boolean,
  ): Promise<{ status: "confirmed" | "rejected" }> {
    const session = uploads.get(uploadId);
    if (!session) {
      return { status: "rejected" };
    }

    if (!isValid) {
      this.cleanup(uploadId);
      return { status: "rejected" };
    }

    this.cleanup(uploadId);
    return { status: "confirmed" };
  }

  /**
   * Remove temporary files and delete the session from the registry.
   *
   * @param uploadId - Session ID to clean up.
   */
  private cleanup(uploadId: string) {
    const session = uploads.get(uploadId);
    if (session && existsSync(session.tempDir)) {
      rmSync(session.tempDir, { recursive: true, force: true });
    }
    uploads.delete(uploadId);
  }
}
