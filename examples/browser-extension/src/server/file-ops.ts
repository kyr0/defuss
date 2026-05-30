import { readFile, writeFile, unlink, access, readdir } from "node:fs/promises";
import { resolve, normalize } from "node:path";
import config from "../../config.js";

/** Mutable workspace root — can be updated at runtime via setWorkspacePath */
let workspacePath = config.workspacePath;

export function getWorkspacePath(): string {
  return workspacePath;
}

export function setWorkspacePath(newPath: string): void {
  workspacePath = newPath;
  console.log(`[file-ops] workspace path set to: ${newPath}`);
}

/** Resolve a relative path against the workspace root, rejecting traversal. */
function safePath(relativePath: string): string {
  const root = workspacePath;
  const resolved = resolve(root, relativePath);
  const normalizedRoot = normalize(root);
  if (!resolved.startsWith(normalizedRoot)) {
    throw new Error(`Path traversal denied: ${relativePath}`);
  }
  return resolved;
}

export interface DirEntry {
  name: string;
  isDirectory: boolean;
}

/** List directory contents at an absolute path. Directories sort first. */
export async function listDirectory(dirPath: string): Promise<DirEntry[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => !e.name.startsWith("."))
    .map((e) => ({ name: e.name, isDirectory: e.isDirectory() }))
    .sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export async function fileRead(relativePath: string): Promise<string> {
  const abs = safePath(relativePath);
  return readFile(abs, "utf-8");
}

export async function fileWrite(
  relativePath: string,
  content: string,
): Promise<void> {
  const abs = safePath(relativePath);
  await writeFile(abs, content, "utf-8");
}

export async function fileDelete(relativePath: string): Promise<void> {
  const abs = safePath(relativePath);
  try {
    await access(abs);
    await unlink(abs);
  } catch {
    // File doesn't exist — idempotent delete
  }
}
