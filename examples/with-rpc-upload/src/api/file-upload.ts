import { addUploadHandler, addDownloadHandler } from "defuss-rpc/server.js";
import { writeFile, readFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";

/** Result returned by the file-upload handler. */
export interface FileUploadResult {
  size: number;
  sha256: string;
  uploadId: string;
  filename: string;
  originalName: string;
}

const UPLOADS_DIR = join(process.cwd(), "uploads");

/**
 * Register the "file-upload" handler.
 *
 * Receives the complete binary payload as a Uint8Array and returns
 * metadata including server-computed hashes for integrity verification.
 */
addUploadHandler<FileUploadResult>("file-upload", async (data, meta) => {
  console.log(
    `[file-upload] Received "${meta.handlerName}" upload: ${data.byteLength} bytes, ` +
    `sha256=${meta.sha256}, filename=${meta.originalFilename}`,
  );

  // Save uploaded file to disk using uploadId as the safe filename
  await mkdir(UPLOADS_DIR, { recursive: true });
  const filePath = join(UPLOADS_DIR, `${meta.uploadId}.bin`);
  await writeFile(filePath, Buffer.from(data));

  // Store the original filename in a companion .meta file
  const metaPath = join(UPLOADS_DIR, `${meta.uploadId}.meta`);
  await writeFile(metaPath, meta.originalFilename || "");

  return {
    size: data.byteLength,
    sha256: meta.sha256,
    uploadId: meta.uploadId,
    filename: `${meta.uploadId}.bin`,
    originalName: meta.originalFilename || `${meta.uploadId}.bin`,
  };
});

/**
 * Register the "file-download" handler.
 *
 * Reads the uploaded file from disk and streams it back to the client.
 */
addDownloadHandler("file-download", async (meta) => {
  const filePath = join(UPLOADS_DIR, `${meta.downloadId}.bin`);
  const metaPath = join(UPLOADS_DIR, `${meta.downloadId}.meta`);

  try {
    const data = await readFile(filePath);

    // Read the original filename from the companion .meta file
    let originalName = `${meta.downloadId}.bin`;
    try {
      await access(metaPath);
      const storedName = (await readFile(metaPath, "utf-8")).trim();
      if (storedName) {
        originalName = storedName;
      }
    } catch {
      // No .meta file found, use fallback
    }

    return {
      data: new Uint8Array(data),
      fileMeta: {
        size: data.byteLength,
        contentType: "application/octet-stream",
        filename: originalName,
      },
    };
  } catch (err) {
    console.error(`[file-download] ERROR: ${err instanceof Error ? err.message : err}`);
    throw err;
  }
});
