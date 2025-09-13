import { timingSafeEqual, createHmac } from "node:crypto";

/** Constant-time compare for equal-length ASCII/UTF-8 strings. */
export function constantTimeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return timingSafeEqual(A, B);
}

/** Optional: HMAC a key with a server-side pepper before comparison/storage. */
export function hmacKey(key: string, pepper: string): string {
  return createHmac("sha256", pepper).update(key).digest("base64url");
}
