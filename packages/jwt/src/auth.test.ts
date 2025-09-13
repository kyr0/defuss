import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { decodeJwt, type JWK } from "jose";
import { importJWK, SignJWT } from "jose";
import { createAuth } from "./auth.js";
import { genEd25519Pair, signJwt } from "./crypto.js";

// Mock randomUUID for predictable jti
vi.mock("node:crypto", async () => {
  const actual = await vi.importActual("node:crypto");
  return {
    ...actual,
    randomUUID: vi.fn(),
  };
});
const mockRandomUUID = vi.mocked(randomUUID);

type Tombstone = { id: string; revoked: boolean; expHint?: number | undefined };

describe("createAuth", () => {
  let a: { publicJwk: JWK; privateJwk: JWK; kid: string };
  let b: { publicJwk: JWK; privateJwk: JWK; kid: string };

  beforeAll(async () => {
    a = await genEd25519Pair();
    b = await genEd25519Pair();
  });

  function makeStorage() {
    const mem = new Map<string, Tombstone>();
    return {
      mem,
      storage: {
        setTokenToStorage: vi.fn(async (t: Tombstone) => {
          mem.set(t.id, { revoked: t.revoked, expHint: t.expHint, id: t.id });
        }),
        getTokenFromStorage: vi.fn(async (id: string) => {
          const v = mem.get(id);
          return v ? { ...v } : undefined;
        }),
      },
    };
  }

  beforeEach(() => {
    // default UUID unless overridden per-test
    mockRandomUUID.mockReturnValue("test-jti-0001-foo-bar");
  });

  it("issues a token and returns token, jti, exp without persisting", async () => {
    const { storage } = makeStorage();
    const nowDate = new Date("2025-01-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(nowDate);
    try {
      const opts = {
        storage,
        now: () => nowDate,
        policy: { iss: "https://issuer", aud: "my-aud", clockToleranceSec: 60 },
      };
      const auth = createAuth(a, opts as any);

      const res = await auth.issueToken({
        sub: "u1",
        ttlSec: 3600,
        scope: ["read", "write"],
        nbfSec: 30, // <= clockTolerance, so internal verify passes
      });

      expect(res.jti).toBe("test-jti-0001-foo-bar");

      const decoded = decodeJwt(res.token);
      const expectedIat = Math.floor(nowDate.getTime() / 1000);
      expect(decoded.sub).toBe("u1");
      expect(decoded.iat).toBe(expectedIat);
      expect(decoded.exp).toBe(expectedIat + 3600);
      expect(decoded.nbf).toBe(expectedIat + 30);
      expect(decoded.iss).toBe("https://issuer");
      expect(decoded.aud).toBe("my-aud");
      expect(decoded.jti).toBe("test-jti-0001-foo-bar");

      expect(storage.setTokenToStorage).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("validates a token and returns normalized claims", async () => {
    const { storage } = makeStorage();
    const nowDate = new Date("2025-01-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(nowDate);
    try {
      const opts = {
        storage,
        now: () => nowDate,
        policy: { iss: "https://issuer", aud: "aud" },
      };
      const auth = createAuth(a, opts as any);

      const { token, jti, exp } = await auth.issueToken({
        sub: "user-42",
        ttlSec: 180,
        scope: ["a", "b"],
      });

      const res = await auth.validateToken(token);
      expect(res.sub).toBe("user-42");
      expect(res.jti).toBe(jti);
      expect(res.exp).toBe(exp);
      expect(Number.isFinite(res.iat)).toBe(true);
      expect(res.scope).toEqual(["a", "b"]);
      expect(storage.getTokenFromStorage).toHaveBeenCalledWith(jti);
    } finally {
      vi.useRealTimers();
    }
  });

  it("revokeToken stores tombstone and validateToken rejects revoked tokens", async () => {
    const { storage, mem } = makeStorage();
    const nowDate = new Date("2025-01-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(nowDate);
    try {
      const opts = {
        storage,
        now: () => nowDate,
        policy: {},
      };
      const auth = createAuth(a, opts as any);
      const { token, jti, exp } = await auth.issueToken({
        sub: "u1",
        ttlSec: 600,
      });

      await auth.revokeToken(jti, exp);
      expect(storage.setTokenToStorage).toHaveBeenCalledWith({
        id: jti,
        revoked: true,
        expHint: exp,
      });
      expect(mem.get(jti)?.revoked).toBe(true);

      await expect(auth.validateToken(token)).rejects.toThrow("Token revoked");
    } finally {
      vi.useRealTimers();
    }
  });

  it("validateToken throws on malformed token claims (missing sub)", async () => {
    const { storage } = makeStorage();
    const opts = {
      storage,
      now: () => new Date(),
      policy: {},
    };
    const auth = createAuth(a, opts as any);

    const now = Math.floor(Date.now() / 1000);
    const token = await signJwt({}, a.privateJwk, a.kid, now + 300, now); // no sub

    await expect(auth.validateToken(token)).rejects.toThrow(
      "Malformed token claims",
    );
  });

  it("enforceKid: rejects token with mismatched kid", async () => {
    const { storage } = makeStorage();
    const opts = {
      storage,
      now: () => new Date(),
      policy: {},
      enforceKid: true,
    };
    const auth = createAuth(a, opts as any);

    const now = Math.floor(Date.now() / 1000);
    const otherToken = await signJwt(
      { sub: "uX" },
      b.privateJwk,
      b.kid, // kid is for key B
      now + 300,
      now,
    );

    await expect(auth.validateToken(otherToken)).rejects.toThrow(
      "Unexpected or missing kid",
    );
  });

  it("uses extraPublicKeys when kid differs and enforceKid is off", async () => {
    const { storage } = makeStorage();
    const opts = {
      storage,
      now: () => new Date(),
      policy: {},
      enforceKid: false,
      extraPublicKeys: { [b.kid]: b.publicJwk },
    };
    const auth = createAuth(a, opts as any);

    const now = Math.floor(Date.now() / 1000);
    const token = await signJwt(
      { sub: "u2" },
      b.privateJwk,
      b.kid, // token signed with B; must verify using extraPublicKeys
      now + 300,
      now,
    );

    const res = await auth.validateToken(token);
    expect(res.sub).toBe("u2");
  });

  it("enforceKid: accepts token when kid matches and uses current public key", async () => {
    const { storage } = makeStorage();
    const nowDate = new Date("2025-01-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(nowDate);
    try {
      const opts = {
        storage,
        now: () => nowDate,
        policy: {},
        enforceKid: true,
      };
      const auth = createAuth(a, opts as any);

      // Issue with same keypair 'a' → header kid matches a.kid
      const { token } = await auth.issueToken({
        sub: "u-match",
        ttlSec: 300,
      });

      const res = await auth.validateToken(token);
      expect(res.sub).toBe("u-match");
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to current public key when kid is missing", async () => {
    const { storage } = makeStorage();
    const nowDate = new Date("2025-01-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(nowDate);
    try {
      const opts = {
        storage,
        now: () => nowDate,
        policy: {},
        enforceKid: false,
      };
      const auth = createAuth(a, opts as any);

      // Create a JWT signed with 'a' but WITHOUT kid in the header
      const iat = Math.floor(nowDate.getTime() / 1000);
      const key = await importJWK(a.privateJwk, "EdDSA");
      const token = await new SignJWT({ sub: "u-missing-kid" })
        .setProtectedHeader({ alg: "EdDSA", typ: "JWT" }) // no kid
        .setIssuedAt(iat)
        .setExpirationTime(iat + 300)
        .setJti("test-jti-missing-kid")
        .sign(key);

      const res = await auth.validateToken(token);
      expect(res.sub).toBe("u-missing-kid");
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to current public key when kid is non-matching and no extraPublicKeys", async () => {
    const { storage } = makeStorage();
    const nowDate = new Date("2025-01-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(nowDate);
    try {
      const opts = {
        storage,
        now: () => nowDate,
        policy: {},
        enforceKid: false,
        // No extraPublicKeys provided → should fall back
      };
      const auth = createAuth(a, opts as any);

      // Create a JWT signed with 'a' but with a bogus kid in header
      const iat = Math.floor(nowDate.getTime() / 1000);
      const key = await importJWK(a.privateJwk, "EdDSA");
      const token = await new SignJWT({ sub: "u-bogus-kid" })
        .setProtectedHeader({ alg: "EdDSA", typ: "JWT", kid: "not-a-kid" })
        .setIssuedAt(iat)
        .setExpirationTime(iat + 300)
        .setJti("test-jti-bogus-kid")
        .sign(key);

      const res = await auth.validateToken(token);
      expect(res.sub).toBe("u-bogus-kid");
    } finally {
      vi.useRealTimers();
    }
  });

  it("issueToken rejects when nbf is beyond clockTolerance", async () => {
    const { storage } = makeStorage();
    const nowDate = new Date("2025-01-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(nowDate);
    try {
      const auth = createAuth(a, {
        storage,
        now: () => nowDate,
        policy: { clockToleranceSec: 30 }, // small tolerance
      } as any);

      await expect(
        auth.issueToken({
          sub: "u1",
          ttlSec: 600,
          nbfSec: 120, // > tolerance, jose verify inside issueToken should fail
        }),
      ).rejects.toThrow();
    } finally {
      vi.useRealTimers();
    }
  });
});
