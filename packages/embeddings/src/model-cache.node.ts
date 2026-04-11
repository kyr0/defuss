import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const DEFAULT_NODE_CACHE_DIR_NAME = "defuss-embeddings";

export const getDefaultNodeCacheDir = (): string => {
  return path.join(os.tmpdir(), DEFAULT_NODE_CACHE_DIR_NAME);
};

export const readNodeCachedFile = async (
  cacheDir: string,
  cacheKey: string,
): Promise<{ bytes: Uint8Array; contentType: string | null } | null> => {
  const filePath = path.join(cacheDir, cacheKey);

  try {
    const bytes = await fs.readFile(filePath);
    return { bytes: new Uint8Array(bytes), contentType: null };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

export const writeNodeCachedFile = async (
  cacheDir: string,
  cacheKey: string,
  bytes: Uint8Array,
): Promise<void> => {
  const filePath = path.join(cacheDir, cacheKey);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, bytes);
};

export const inspectNodeCachedFile = async (
  cacheDir: string,
  cacheKey: string,
): Promise<boolean> => {
  const filePath = path.join(cacheDir, cacheKey);

  try {
    await fs.stat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

export const deleteNodeCachedFile = async (
  cacheDir: string,
  cacheKey: string,
): Promise<boolean> => {
  const filePath = path.join(cacheDir, cacheKey);

  try {
    await fs.rm(filePath, { force: true });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
};
