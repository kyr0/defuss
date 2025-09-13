import { describe, it, expect } from "vitest";
import { randomBytes, createHmac } from "node:crypto";
import { constantTimeEqual, hmacKey } from "./keysafe.js";

// Helper: ensure base64url alphabet (no '+', '/', '=')
function isBase64Url(s: string) {
  return /^[A-Za-z0-9\-_]+$/.test(s);
}

describe("constantTimeEqual", () => {
  it("returns true for identical ASCII strings", () => {
    expect(constantTimeEqual("abc123", "abc123")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(constantTimeEqual("abc123", "abc124")).toBe(false);
  });

  it("returns false for different lengths (and does not throw)", () => {
    expect(constantTimeEqual("short", "longer")).toBe(false);
  });

  it("handles empty strings", () => {
    expect(constantTimeEqual("", "")).toBe(true);
    expect(constantTimeEqual("", "a")).toBe(false);
  });

  it("is symmetric and reflexive", () => {
    const a = "symmetry";
    const b = "symmetrx";
    expect(constantTimeEqual(a, a)).toBe(true);
    expect(constantTimeEqual(b, b)).toBe(true);
    expect(constantTimeEqual(a, b)).toBe(false);
    expect(constantTimeEqual(b, a)).toBe(false);
  });

  it("works with UTF-8 (emoji) when byte lengths match; otherwise false", () => {
    const s1 = "🙂🙂"; // each is 4 bytes in UTF-8 => total 8
    const s2 = "🙂🙂"; // identical
    const s3 = "🙂🙃"; // same byte length but different bytes
    const s4 = "🙂"; // different byte length

    expect(constantTimeEqual(s1, s2)).toBe(true);
    expect(constantTimeEqual(s1, s3)).toBe(false);
    expect(constantTimeEqual(s1, s4)).toBe(false);
  });

  it("gives consistent results over random binary-like data (encoded as utf8)", () => {
    // generate random byte arrays and compare their hex strings (same length)
    for (let i = 0; i < 20; i++) {
      const a = randomBytes(32).toString("hex"); // 64 chars
      const b = randomBytes(32).toString("hex"); // 64 chars
      // identical vs different
      expect(constantTimeEqual(a, a)).toBe(true);
      // probability of equality is negligible; if they ever match, skip that iteration
      if (a !== b) expect(constantTimeEqual(a, b)).toBe(false);
    }
  });
});

describe("hmacKey", () => {
  it("matches Node's HMAC(SHA-256) with base64url encoding", () => {
    const key = "super-secret";
    const pepper = "server-pepper";
    const expected = createHmac("sha256", pepper)
      .update(key)
      .digest("base64url");
    expect(hmacKey(key, pepper)).toBe(expected);
  });

  it("changes when key changes", () => {
    const pepper = "pep";
    const a = hmacKey("k1", pepper);
    const b = hmacKey("k2", pepper);
    expect(a).not.toBe(b);
  });

  it("changes when pepper changes", () => {
    const key = "k";
    const a = hmacKey(key, "pep1");
    const b = hmacKey(key, "pep2");
    expect(a).not.toBe(b);
  });

  it("emits strict base64url (no '+', '/', '=')", () => {
    for (let i = 0; i < 10; i++) {
      const key = randomBytes(20 + i).toString("base64"); // arbitrary input
      const out = hmacKey(key, "pep");
      expect(isBase64Url(out)).toBe(true);
    }
  });

  it("is deterministic for same inputs", () => {
    const key = "abc";
    const pep = "pepper";
    const a = hmacKey(key, pep);
    const b = hmacKey(key, pep);
    expect(a).toBe(b);
  });
});
