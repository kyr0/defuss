import { getRpcClient } from "defuss-rpc/client.js";
import type { FileUploadApi } from "./api/file-upload.js";

/** Progress state emitted during each step of a chunked file upload. */
export interface UploadProgress {
  /** Completion percentage (0–100). */
  percent: number;
  /** Bytes successfully written to the server so far. */
  bytesUploaded: number;
  /** Total file size in bytes. */
  totalBytes: number;
  /** Current phase of the upload pipeline. */
  status: "uploading" | "finalizing" | "verifying" | "confirmed" | "rejected" | "error";
  /** Server-computed MD5 hex digest (set after finalization). */
  serverMd5?: string;
  /** Client-computed MD5 hex digest (set after verification). */
  clientMd5?: string;
}

/**
 * Upload a file in chunks via defuss-rpc, with MD5 integrity verification.
 *
 * The client computes its own MD5 and compares it against the server's MD5.
 * The client **never** sends its MD5 to the server — only a boolean `isValid`.
 *
 * @param file - The `File` object to upload (from an `<input type="file">`).
 * @param rpcBaseUrl - Base URL of the running defuss-rpc server.
 * @param chunkSize - Size (in bytes) of each chunk sent over RPC. Defaults to 64 KiB.
 * @yields {UploadProgress} after each chunk and during finalization/verification.
 */
export async function* uploadFile(
  file: File,
  rpcBaseUrl: string,
  chunkSize = 65536,
): AsyncGenerator<UploadProgress> {
  const client = await getRpcClient<{ FileUploadApi: new () => FileUploadApi }>({
    baseUrl: rpcBaseUrl,
  });

  const api = new client.FileUploadApi();

  // Start upload session
  const { uploadId } = await api.startUpload(
    file.name,
    file.size,
  );

  const totalBytes = file.size;
  let bytesUploaded = 0;

  // Accumulate all bytes for client-side MD5 computation
  const allBytes = new Uint8Array(totalBytes);

  // Send chunks
  while (bytesUploaded < totalBytes) {
    const start = bytesUploaded;
    const end = Math.min(start + chunkSize, totalBytes);
    const blob = file.slice(start, end);
    const arrayBuffer = await blob.arrayBuffer();
    const chunk = new Uint8Array(arrayBuffer);

    // Copy into the full buffer for later MD5
    allBytes.set(chunk, start);

    const result = await api.uploadChunk(
      uploadId,
      chunk,
    );

    if (result.status === "error") {
      yield {
        percent: Math.round((bytesUploaded / totalBytes) * 100),
        bytesUploaded,
        totalBytes,
        status: "error",
      };
      return;
    }

    bytesUploaded = result.bytesWritten;

    yield {
      percent: Math.round((bytesUploaded / totalBytes) * 100),
      bytesUploaded,
      totalBytes,
      status: "uploading",
    };
  }

  // Finalize upload — server computes its MD5
  yield {
    percent: 100,
    bytesUploaded: totalBytes,
    totalBytes,
    status: "finalizing",
  };

  const finalResult = await api.finalizeUpload(uploadId);

  if ("error" in finalResult) {
    yield {
      percent: 100,
      bytesUploaded: totalBytes,
      totalBytes,
      status: "error",
    };
    return;
  }

  // Compute client-side MD5
  yield {
    percent: 100,
    bytesUploaded: totalBytes,
    totalBytes,
    status: "verifying",
  };

  const clientMd5 = md5(allBytes);
  const serverMd5 = finalResult.serverMd5;
  const isValid = clientMd5 === serverMd5;

  // Confirm integrity — only send boolean, never the client MD5
  const confirmResult = await api.confirmIntegrity(
    uploadId,
    isValid,
  );

  yield {
    percent: 100,
    bytesUploaded: totalBytes,
    totalBytes,
    status: confirmResult.status,
    serverMd5,
    clientMd5,
  };
}

/**
 * Pure-JS MD5 hash for browsers (SubtleCrypto does not support MD5).
 *
 * Implements RFC 1321 with no external dependencies.
 *
 * @param input - Raw bytes to hash.
 * @returns Hex-encoded 128-bit MD5 digest.
 */
function md5(input: Uint8Array): string {
  const bytes = input;
  const len = bytes.length;

  // Pre-processing: adding padding bits
  const bitLen = len * 8;
  // Append "1" bit, then zeros, then 64-bit length
  const padLen = ((56 - (len + 1) % 64) + 64) % 64;
  const totalLen = len + 1 + padLen + 8;
  const buf = new Uint8Array(totalLen);
  buf.set(bytes);
  buf[len] = 0x80;

  // Append original length in bits as 64-bit LE
  const view = new DataView(buf.buffer);
  view.setUint32(totalLen - 8, bitLen >>> 0, true);
  view.setUint32(totalLen - 4, (bitLen / 0x100000000) >>> 0, true);

  // Initialize hash values
  let a0 = 0x67452301;
  let b0 = 0xEFCDAB89;
  let c0 = 0x98BADCFE;
  let d0 = 0x10325476;

  // Per-round shift amounts
  const s = [
    7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
    5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
    4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
    6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,
  ];

  // Pre-computed constants (floor(2^32 * abs(sin(i+1))))
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
  }

  // Process each 512-bit (64-byte) chunk
  for (let offset = 0; offset < totalLen; offset += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(offset + j * 4, true);
    }

    let A = a0, B = b0, C = c0, D = d0;

    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + ((F << s[i]) | (F >>> (32 - s[i])))) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  // Produce the final hash as hex string (LE)
  const result = new Uint8Array(16);
  const rv = new DataView(result.buffer);
  rv.setUint32(0, a0, true);
  rv.setUint32(4, b0, true);
  rv.setUint32(8, c0, true);
  rv.setUint32(12, d0, true);

  return Array.from(result).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export { md5 };
