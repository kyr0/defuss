import { addUploadHandler } from "defuss-rpc/server.js";

/** Result returned by the file-upload handler. */
export interface FileUploadResult {
  size: number;
  sha256: string;
  md5: string;
  uploadId: string;
}

/**
 * Register the "file-upload" handler.
 *
 * Receives the complete binary payload as a Uint8Array and returns
 * metadata including server-computed hashes for integrity verification.
 */
addUploadHandler<FileUploadResult>("file-upload", async (data, meta) => {
  console.log(
    `[file-upload] Received "${meta.handlerName}" upload: ${data.byteLength} bytes, ` +
    `sha256=${meta.sha256}, md5=${meta.md5}`,
  );
  return {
    size: data.byteLength,
    sha256: meta.sha256,
    md5: meta.md5,
    uploadId: meta.uploadId,
  };
});
