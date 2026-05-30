import { getNamespacedKey } from "../content-script/utils";

// Blob storage using chrome.storage.local with unlimitedStorage permission
// Blobs are stored as base64-encoded strings with metadata

export interface StoredBlob {
  data: string; 		 // base64-encoded
  type: string; 		 // MIME type
  size: number; 		 // original byte size
  createdAt: number; // timestamp for when the blob was stored
}

const toBlobKey = (key: string) => `__blob_${getNamespacedKey(key)}`;

export const setBlobValue = async (key: string, blob: Blob): Promise<void> => {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const stored: StoredBlob = {
    data: base64,
    type: blob.type,
    size: blob.size,
    createdAt: Date.now(),
  };

  await chrome.storage.local.set({ [toBlobKey(key)]: stored });
};

export const getBlobValue = async (key: string): Promise<Blob | undefined> => {
  const result = await chrome.storage.local.get([toBlobKey(key)]);
  const stored = result[toBlobKey(key)] as StoredBlob | undefined;

  if (!stored) return undefined;

  const binary = atob(stored.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: stored.type });
};

export const setArrayBufferValue = async (
  key: string,
  buffer: ArrayBuffer,
  type = "application/octet-stream",
): Promise<void> => {
  await setBlobValue(key, new Blob([buffer], { type }));
};

export const getArrayBufferValue = async (
  key: string,
): Promise<ArrayBuffer | undefined> => {
  const blob = await getBlobValue(key);
  if (!blob) return undefined;
  return blob.arrayBuffer();
};

export const removeBlobValue = async (key: string): Promise<void> => {
  await chrome.storage.local.remove(toBlobKey(key));
};

export const getBlobMeta = async (
  key: string,
): Promise<{ type: string; size: number; createdAt: number } | undefined> => {
  const result = await chrome.storage.local.get([toBlobKey(key)]);
  const stored = result[toBlobKey(key)] as StoredBlob | undefined;

  if (!stored) return undefined;

  return { type: stored.type, size: stored.size, createdAt: stored.createdAt };
};
