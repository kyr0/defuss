import { DSON } from "defuss-dson";
import type { FileUploadResult } from "./api/file-upload.js";

export type UploadEvent<T = unknown> =
  | { type: "sending"; bytesSent: number; totalBytes: number; percent: number }
  | { type: "receiving"; bytesReceived: number; totalBytes: number; percent: number }
  | {
      type: "complete";
      result: T;
      uploadId: string;
      bytesReceived: number;
      sha256: string;
      md5: string;
      durationMs: number;
    };

export interface UploadResult<T = unknown> {
  result: T;
  uploadId: string;
  bytesReceived: number;
  sha256: string;
  md5: string;
  durationMs: number;
}

/**
 * Upload a file using the new /rpc/upload transport and yield progress events.
 */
export async function* uploadFile(
  file: File,
  baseUrl: string,
): AsyncGenerator<UploadEvent<FileUploadResult>> {
  const uploadId = crypto.randomUUID();
  const totalBytes = file.size;

  // Queue receives SSE server progress events while the upload request is in-flight.
  const queue: UploadEvent<FileUploadResult>[] = [];
  let eventSource: EventSource | null = null;

  if (typeof EventSource !== "undefined") {
    try {
      eventSource = new EventSource(`${baseUrl}/rpc/upload/progress/${uploadId}`);
      eventSource.onmessage = (ev) => {
        try {
          const frame = JSON.parse(ev.data) as {
            type?: string;
            bytesReceived?: number;
            totalBytes?: number;
            percent?: number;
          };
          if (frame.type === "progress") {
            queue.push({
              type: "receiving",
              bytesReceived: frame.bytesReceived ?? 0,
              totalBytes: frame.totalBytes ?? totalBytes,
              percent: frame.percent ?? 0,
            });
          }
        } catch {
          // Ignore malformed SSE frames.
        }
      };
      eventSource.onerror = () => {
        // Keep upload running if SSE fails.
      };
    } catch {
      // EventSource creation failed; continue without receiving events.
    }
  }

  // Client-side send start marker.
  yield {
    type: "sending",
    bytesSent: 0,
    totalBytes,
    percent: 0,
  };

  const response = await fetch(`${baseUrl}/rpc/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Upload-Handler": "file-upload",
      "X-Upload-Id": uploadId,
      "X-Original-Size": String(totalBytes),
      "X-Upload-Offset": "0",
    },
    body: file,
  });

  // Upload body is now fully sent from the browser perspective.
  yield {
    type: "sending",
    bytesSent: totalBytes,
    totalBytes,
    percent: 100,
  };

  while (queue.length > 0) {
    yield queue.shift()!;
  }

  eventSource?.close();

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  const responseText = await response.text();
  const lines = responseText.split("\n").filter(Boolean);

  let receivedFrame: {
    uploadId: string;
    bytesReceived: number;
    sha256: string;
    md5: string;
    durationMs: number;
  } | null = null;
  let resultFrame: { value: FileUploadResult } | null = null;

  for (const line of lines) {
    const frame = DSON.parse(line) as
      | {
          type: "received";
          uploadId: string;
          bytesReceived: number;
          sha256: string;
          md5: string;
          durationMs: number;
        }
      | { type: "result"; value: FileUploadResult }
      | { type: "error"; error: { message: string } };

    if (frame.type === "received") {
      receivedFrame = frame;
    } else if (frame.type === "result") {
      resultFrame = frame;
    } else if (frame.type === "error") {
      throw new Error(frame.error?.message || "Upload handler error");
    }
  }

  if (!receivedFrame || !resultFrame) {
    throw new Error("Upload response missing required NDJSON frames");
  }

  yield {
    type: "complete",
    result: resultFrame.value,
    uploadId: receivedFrame.uploadId,
    bytesReceived: receivedFrame.bytesReceived,
    sha256: receivedFrame.sha256,
    md5: receivedFrame.md5,
    durationMs: receivedFrame.durationMs,
  };
}

/** Upload a file and return only the final result. */
export async function uploadFileComplete(
  file: File,
  baseUrl: string,
): Promise<UploadResult<FileUploadResult>> {
  let result: UploadResult<FileUploadResult> | undefined;

  for await (const event of uploadFile(file, baseUrl)) {
    if (event.type === "complete") {
      result = {
        result: event.result,
        uploadId: event.uploadId,
        bytesReceived: event.bytesReceived,
        sha256: event.sha256,
        md5: event.md5,
        durationMs: event.durationMs,
      };
    }
  }

  if (!result) {
    throw new Error("Upload finished without a complete event");
  }

  return result;
}
