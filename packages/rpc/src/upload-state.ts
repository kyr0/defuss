import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, stat, rm } from "node:fs/promises";
import type { UploadProgressEvent } from "./types.d.js";

// ── Session types ────────────────────────────────────────────────────────────

export interface UploadSession {
  uploadId: string;
  handlerName: string;
  originalSize: number;
  bytesReceived: number;
  tempFilePath: string;
  status: "uploading" | "complete" | "error";
  progressListeners: Set<(event: UploadProgressEvent) => void>;
  createdAt: number;
}

// ── State stores ─────────────────────────────────────────────────────────────

const sessions: Map<string, UploadSession> = new Map();

let uploadDir: string = join(tmpdir(), "defuss-uploads");

// ── Upload directory ─────────────────────────────────────────────────────────

/** Returns the directory used for upload temp files. */
export function getUploadDir(): string {
  return uploadDir;
}

/** Sets the directory used for upload temp files. */
export function setUploadDir(dir: string): void {
  uploadDir = dir;
}

/** Ensures the upload directory exists on disk. */
export async function ensureUploadDir(): Promise<void> {
  await mkdir(uploadDir, { recursive: true });
}

// ── Session CRUD ─────────────────────────────────────────────────────────────

/**
 * Creates a new upload session and returns it.
 * The temp file path is `{uploadDir}/{uploadId}.part`.
 */
export function createSession(
  uploadId: string,
  handlerName: string,
  originalSize: number,
): UploadSession {
  const session: UploadSession = {
    uploadId,
    handlerName,
    originalSize,
    bytesReceived: 0,
    tempFilePath: join(uploadDir, `${uploadId}.part`),
    status: "uploading",
    progressListeners: new Set(),
    createdAt: Date.now(),
  };
  sessions.set(uploadId, session);
  return session;
}

/** Retrieves a session by ID, or `undefined` if not found. */
export function getSession(uploadId: string): UploadSession | undefined {
  return sessions.get(uploadId);
}

/** Updates mutable fields of an existing session. */
export function updateSession(
  uploadId: string,
  updates: Partial<Pick<UploadSession, "bytesReceived" | "status">>,
): void {
  const session = sessions.get(uploadId);
  if (!session) return;
  if (updates.bytesReceived !== undefined) session.bytesReceived = updates.bytesReceived;
  if (updates.status !== undefined) session.status = updates.status;
}

/** Removes a session from the in-memory store (does NOT delete the temp file). */
export function deleteSession(uploadId: string): void {
  sessions.delete(uploadId);
}

// ── Progress pub/sub ─────────────────────────────────────────────────────────

/** Subscribes to progress events for a given upload. */
export function addProgressListener(
  uploadId: string,
  callback: (event: UploadProgressEvent) => void,
): void {
  const session = sessions.get(uploadId);
  if (session) {
    session.progressListeners.add(callback);
  }
}

/** Unsubscribes from progress events for a given upload. */
export function removeProgressListener(
  uploadId: string,
  callback: (event: UploadProgressEvent) => void,
): void {
  const session = sessions.get(uploadId);
  if (session) {
    session.progressListeners.delete(callback);
  }
}

/** Pushes a progress event to all listeners for the given upload. */
export function emitProgress(
  uploadId: string,
  event: UploadProgressEvent,
): void {
  const session = sessions.get(uploadId);
  if (!session) return;
  for (const listener of session.progressListeners) {
    try {
      listener(event);
    } catch (_) {
      // Listener threw — remove it to avoid repeated failures.
      session.progressListeners.delete(listener);
    }
  }
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

/**
 * Deletes the temp file for a session and removes the session from the store.
 * Safe to call even if the file doesn't exist.
 */
export async function cleanupSession(uploadId: string): Promise<void> {
  const session = sessions.get(uploadId);
  if (session) {
    await rm(session.tempFilePath, { force: true }).catch(() => {});
    sessions.delete(uploadId);
  }
}

/**
 * Clears all sessions and deletes all temp files.
 * Intended for **test isolation only**.
 */
export async function clearAllSessions(): Promise<void> {
  for (const session of sessions.values()) {
    await rm(session.tempFilePath, { force: true }).catch(() => {});
  }
  sessions.clear();
}

// ── Resume helper ────────────────────────────────────────────────────────────

/**
 * Returns the actual byte count stored in the temp file on disk.
 * Used to verify the client's claimed offset during resume.
 * Returns 0 if the file doesn't exist.
 */
export async function getTempFileSize(uploadId: string): Promise<number> {
  const session = sessions.get(uploadId);
  if (!session) return 0;
  try {
    const st = await stat(session.tempFilePath);
    return st.size;
  } catch {
    return 0;
  }
}
