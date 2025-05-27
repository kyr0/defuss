export const _HEX_PREFIX = "hex:";

export function binaryToHex(buffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  let result = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    result += bytes[i].toString(16).padStart(2, "0");
  }
  return `${_HEX_PREFIX}${result}`;
}

export function hexToBinary(hexString: string): ArrayBufferLike {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const hexByte = hexString.slice(i * 2, i * 2 + 2);
    bytes[i] = Number.parseInt(hexByte, 16);
  }
  return bytes.buffer;
}

export function textToBinary(text: string): ArrayBufferLike {
  return new TextEncoder().encode(text).buffer;
}

export function binaryToText(buffer: ArrayBufferLike): string {
  return new TextDecoder().decode(new Uint8Array(buffer));
}
