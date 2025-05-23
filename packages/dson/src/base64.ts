import { _HEX_PREFIX, _hexToBinary } from "./binary.js";

export const _BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Cache the lookup map for better performance
export let _base64LookupMap = null as Record<string, number> | null;

export function _getBase64LookupMap(): Record<string, number> {
  // Create the lookup map only once and cache it
  if (!_base64LookupMap) {
    _base64LookupMap = {};
    for (let i = 0; i < _BASE64_CHARS.length; i++) {
      _base64LookupMap[_BASE64_CHARS[i]] = i;
    }
  }
  return _base64LookupMap;
}

export function _binaryToBase64(buffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);

  if (bytes.length === 0) return "";

  let result = "";

  // Process every 3 bytes and convert to 4 base64 characters
  for (let i = 0; i < bytes.length; i += 3) {
    // Get three bytes (or pad with zeros if we're at the end)
    const byte1 = bytes[i];
    const byte2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const byte3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    // Split into 4 6-bit chunks
    const chunk1 = byte1 >> 2;
    const chunk2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
    const chunk3 = ((byte2 & 0x0f) << 2) | (byte3 >> 6);
    const chunk4 = byte3 & 0x3f;

    // Add characters with padding if necessary
    result += _BASE64_CHARS[chunk1];
    result += _BASE64_CHARS[chunk2];
    result += i + 1 < bytes.length ? _BASE64_CHARS[chunk3] : "=";
    result += i + 2 < bytes.length ? _BASE64_CHARS[chunk4] : "=";
  }
  return result;
}

export function _base64ToBinary(base64: string): ArrayBufferLike {
  // Handle hex encoding fallback
  if (base64.startsWith(_HEX_PREFIX)) {
    return _hexToBinary(base64.slice(_HEX_PREFIX.length));
  }

  try {
    // Remove padding characters
    const input = base64.replace(/=+$/, "");
    if (input.length === 0) return new ArrayBuffer(0);

    // Get our lookup table for fast character to value conversion
    const lookupMap = _getBase64LookupMap();

    // Calculate output size - each 4 base64 chars become 3 bytes
    const outputLength = Math.floor((input.length * 3) / 4);
    const bytes = new Uint8Array(outputLength);

    // Convert each group of 4 base64 characters to 3 bytes
    let outputIndex = 0;
    for (let i = 0; i < input.length; i += 4) {
      // Get four 6-bit values
      const chunk1 = lookupMap[input[i]] || 0;
      const chunk2 = lookupMap[input[i + 1]] || 0;
      const chunk3 = i + 2 < input.length ? lookupMap[input[i + 2]] || 0 : 0;
      const chunk4 = i + 3 < input.length ? lookupMap[input[i + 3]] || 0 : 0;

      // Recombine into 3 bytes (if all characters were present)
      bytes[outputIndex++] = (chunk1 << 2) | (chunk2 >> 4);

      // Only add more bytes if we had enough input characters
      if (i + 2 < input.length) {
        bytes[outputIndex++] = ((chunk2 & 0x0f) << 4) | (chunk3 >> 2);
      }
      if (i + 3 < input.length) {
        bytes[outputIndex++] = ((chunk3 & 0x03) << 6) | chunk4;
      }
    }
    return bytes.buffer;
  } catch (e) {
    console.error("Failed to decode base64 data", e);
    return new ArrayBuffer(0);
  }
}
