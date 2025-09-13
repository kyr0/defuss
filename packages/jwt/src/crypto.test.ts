import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { decodeJwt, type JWK, calculateJwkThumbprint } from "jose";
import {
  sha256Base64Url,
  genEd25519Pair,
  signJwt,
  verifyJwtWithKey,
  peekHeader,
} from "./crypto.js";

// Mock randomUUID for predictable tests
vi.mock("node:crypto", async () => {
  const actual = await vi.importActual("node:crypto");
  return {
    ...actual,
    randomUUID: vi.fn(),
  };
});

const mockRandomUUID = vi.mocked(randomUUID);

// Small helper to derive expected kid in tests
async function expectedKidFromPublicJwk(pub: JWK) {
  const { kid: _ignored, ...withoutKid } = pub as any;
  return await calculateJwkThumbprint(withoutKid, "sha256");
}

describe("crypto", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sha256Base64Url", () => {
    it("generates consistent hash for same input", () => {
      const input = "test string";
      const hash1 = sha256Base64Url(input);
      const hash2 = sha256Base64Url(input);
      expect(hash1).toBe(hash2);
    });

    it("generates different hashes for different inputs", () => {
      const hash1 = sha256Base64Url("test1");
      const hash2 = sha256Base64Url("test2");
      expect(hash1).not.toBe(hash2);
    });

    it("returns base64url format", () => {
      const hash = sha256Base64Url("test");
      // Base64url should not contain +, /, or = padding
      expect(hash).not.toMatch(/[+/=]/);
      expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("handles empty string", () => {
      const hash = sha256Base64Url("");
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe("string");
    });

    it("handles unicode characters", () => {
      const hash = sha256Base64Url("🔐🚀");
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe("string");
    });
  });

  describe("genEd25519Pair", () => {
    it("generates key pair with matching kid", async () => {
      const { publicJwk, privateJwk, kid } = await genEd25519Pair();

      expect(publicJwk.kid).toBe(kid);
      expect(privateJwk.kid).toBe(kid);
    });

    it("generates keys with correct properties", async () => {
      const { publicJwk, privateJwk } = await genEd25519Pair();

      // Public key properties
      expect(publicJwk.kty).toBe("OKP");
      expect(publicJwk.crv).toBe("Ed25519");
      expect(publicJwk.x).toBeTruthy();
      expect(publicJwk.d).toBeUndefined(); // No private component

      // Private key properties
      expect(privateJwk.kty).toBe("OKP");
      expect(privateJwk.crv).toBe("Ed25519");
      expect(privateJwk.x).toBeTruthy();
      expect(privateJwk.d).toBeTruthy(); // Has private component
    });

    it("generates different keys on each call", async () => {
      const pair1 = await genEd25519Pair();
      const pair2 = await genEd25519Pair();

      expect(pair1.kid).not.toBe(pair2.kid);
      expect(pair1.publicJwk.x).not.toBe(pair2.publicJwk.x);
    });

    it("generates kid from public key thumbprint", async () => {
      const { publicJwk, kid } = await genEd25519Pair();
      const expectedKid = await expectedKidFromPublicJwk(publicJwk);
      expect(kid).toBe(expectedKid);
    });
  });

  describe("signJwt", () => {
    let keyPair: { publicJwk: JWK; privateJwk: JWK; kid: string };
    const mockPayload = { sub: "user123", role: "admin" };
    const mockIat = Math.floor(Date.now() / 1000);
    const mockExp = mockIat + 3600; // 1 hour

    beforeEach(async () => {
      keyPair = await genEd25519Pair();
      // Default JTI for tests that don't override it
      mockRandomUUID.mockReturnValue("test-uuid-123-foo-bar");
    });

    it("creates valid JWT with correct structure", async () => {
      const token = await signJwt(
        mockPayload,
        keyPair.privateJwk,
        keyPair.kid,
        mockExp,
        mockIat,
      );

      expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

      const decoded = decodeJwt(token);
      expect(decoded.sub).toBe("user123");
      expect(decoded.role).toBe("admin");
      expect(decoded.iat).toBe(mockIat);
      expect(decoded.exp).toBe(mockExp);
      expect(decoded.jti).toBe("test-uuid-123-foo-bar");
    });

    it("sets correct header", async () => {
      const token = await signJwt(
        mockPayload,
        keyPair.privateJwk,
        keyPair.kid,
        mockExp,
        mockIat,
      );

      const header = peekHeader(token);
      expect(header.alg).toBe("EdDSA");
      expect(header.kid).toBe(keyPair.kid);
      expect(header.typ).toBe("JWT");
    });

    it("handles empty payload", async () => {
      const token = await signJwt(
        {},
        keyPair.privateJwk,
        keyPair.kid,
        mockExp,
        mockIat,
      );

      const decoded = decodeJwt(token);
      expect(decoded.iat).toBe(mockIat);
      expect(decoded.exp).toBe(mockExp);
    });

    it("includes unique jti for each token", async () => {
      mockRandomUUID
        .mockReturnValueOnce("test-uuid1-123-foo-bar")
        .mockReturnValueOnce("test-uuid2-123-foo-bar");

      const token1 = await signJwt(
        mockPayload,
        keyPair.privateJwk,
        keyPair.kid,
        mockExp,
        mockIat,
      );
      const token2 = await signJwt(
        mockPayload,
        keyPair.privateJwk,
        keyPair.kid,
        mockExp,
        mockIat,
      );

      const decoded1 = decodeJwt(token1);
      const decoded2 = decodeJwt(token2);
      expect(decoded1.jti).toBe("test-uuid1-123-foo-bar");
      expect(decoded2.jti).toBe("test-uuid2-123-foo-bar");
    });
  });

  describe("verifyJwtWithKey", () => {
    let keyPair: { publicJwk: JWK; privateJwk: JWK; kid: string };
    let validToken: string;
    const mockPayload = { sub: "user123", role: "admin" };
    const mockIat = Math.floor(Date.now() / 1000);
    const mockExp = mockIat + 3600;

    beforeEach(async () => {
      keyPair = await genEd25519Pair();
      validToken = await signJwt(
        mockPayload,
        keyPair.privateJwk,
        keyPair.kid,
        mockExp,
        mockIat,
      );
    });

    it("verifies valid token successfully", async () => {
      const result = await verifyJwtWithKey(validToken, keyPair.publicJwk);

      expect(result.payload.sub).toBe("user123");
      expect(result.payload.role).toBe("admin");
      expect(result.protectedHeader.alg).toBe("EdDSA");
      expect(result.protectedHeader.kid).toBe(keyPair.kid);
    });

    it("rejects token with wrong public key", async () => {
      const wrongKeyPair = await genEd25519Pair();

      await expect(
        verifyJwtWithKey(validToken, wrongKeyPair.publicJwk),
      ).rejects.toThrow();
    });

    it("rejects expired token", async () => {
      const expiredToken = await signJwt(
        mockPayload,
        keyPair.privateJwk,
        keyPair.kid,
        mockIat - 1, // Already expired
        mockIat - 3600,
      );

      await expect(
        verifyJwtWithKey(expiredToken, keyPair.publicJwk),
      ).rejects.toThrow();
    });

    it("accepts token with custom options", async () => {
      const futureToken = await signJwt(
        mockPayload,
        keyPair.privateJwk,
        keyPair.kid,
        mockIat + 7200, // 2 hours from now
        mockIat + 3600, // 1 hour from now (future iat)
      );

      // Should normally fail due to future iat, but we'll allow clock skew
      const result = await verifyJwtWithKey(futureToken, keyPair.publicJwk, {
        clockTolerance: 7200, // 2 hours tolerance
      });

      expect(result.payload.sub).toBe("user123");
    });

    it("rejects malformed token", async () => {
      await expect(
        verifyJwtWithKey("invalid.token", keyPair.publicJwk),
      ).rejects.toThrow();
    });

    it("rejects token with invalid signature", async () => {
      const parts = validToken.split(".");
      const tamperedToken = `${parts[0]}.${parts[1]}.invalid-signature`;

      await expect(
        verifyJwtWithKey(tamperedToken, keyPair.publicJwk),
      ).rejects.toThrow();
    });

    it("verifies with issuer and audience", async () => {
      const { publicJwk, privateJwk, kid } = await genEd25519Pair();
      const now = Math.floor(Date.now() / 1000);
      const token = await signJwt(
        { sub: "u1", iss: "https://issuer", aud: "my-aud" },
        privateJwk,
        kid,
        now + 3600,
        now,
      );
      await expect(
        verifyJwtWithKey(token, publicJwk, {
          issuer: "https://issuer",
          audience: "my-aud",
        }),
      ).resolves.toBeTruthy();

      await expect(
        verifyJwtWithKey(token, publicJwk, { issuer: "wrong" }),
      ).rejects.toThrow();
    });
  });

  describe("peekHeader", () => {
    let keyPair: { publicJwk: JWK; privateJwk: JWK; kid: string };
    let validToken: string;

    beforeEach(async () => {
      keyPair = await genEd25519Pair();
      validToken = await signJwt(
        { sub: "test" },
        keyPair.privateJwk,
        keyPair.kid,
        Math.floor(Date.now() / 1000) + 3600,
        Math.floor(Date.now() / 1000),
      );
    });

    it("decodes valid EdDSA header", () => {
      const header = peekHeader(validToken);

      expect(header.alg).toBe("EdDSA");
      expect(header.kid).toBe(keyPair.kid);
      expect(header.typ).toBe("JWT");
    });

    it("throws on non-EdDSA algorithm", () => {
      // Create a mock token with RS256 header
      const mockHeader = Buffer.from(
        JSON.stringify({ alg: "RS256", typ: "JWT" }),
      ).toString("base64url");
      const mockToken = `${mockHeader}.payload.signature`;

      expect(() => peekHeader(mockToken)).toThrow(
        "Invalid alg (must be EdDSA)",
      );
    });

    it("throws on unsupported curve", () => {
      const mockHeader = Buffer.from(
        JSON.stringify({
          alg: "EdDSA",
          crv: "X25519",
          typ: "JWT",
        }),
      ).toString("base64url");
      const mockToken = `${mockHeader}.payload.signature`;

      expect(() => peekHeader(mockToken)).toThrow(
        "Unsupported curve (must be Ed25519)",
      );
    });

    it("accepts EdDSA without crv specified", () => {
      const mockHeader = Buffer.from(
        JSON.stringify({
          alg: "EdDSA",
          typ: "JWT",
          kid: "test-kid",
        }),
      ).toString("base64url");
      const mockToken = `${mockHeader}.payload.signature`;

      const header = peekHeader(mockToken);
      expect(header.alg).toBe("EdDSA");
      expect(header.kid).toBe("test-kid");
    });

    it("throws on malformed token", () => {
      expect(() => peekHeader("invalid")).toThrow();
      expect(() => peekHeader("invalid.token")).toThrow();
    });

    it("throws on invalid base64url header", () => {
      const invalidToken = "invalid-base64!!!.payload.signature";
      expect(() => peekHeader(invalidToken)).toThrow();
    });
  });

  describe("integration tests", () => {
    it("full sign and verify cycle works", async () => {
      const keyPair = await genEd25519Pair();
      const payload = {
        sub: "user123",
        role: "admin",
        permissions: ["read", "write"],
      };
      const iat = Math.floor(Date.now() / 1000);
      const exp = iat + 3600;

      // Sign
      const token = await signJwt(
        payload,
        keyPair.privateJwk,
        keyPair.kid,
        exp,
        iat,
      );

      // Peek header
      const header = peekHeader(token);
      expect(header.alg).toBe("EdDSA");
      expect(header.kid).toBe(keyPair.kid);

      // Verify
      const result = await verifyJwtWithKey(token, keyPair.publicJwk);
      expect(result.payload.sub).toBe("user123");
      expect(result.payload.role).toBe("admin");
      expect(result.payload.permissions).toEqual(["read", "write"]);
    });

    it("kid consistency across operations", async () => {
      const keyPair = await genEd25519Pair();
      expect(keyPair.publicJwk.kid).toBe(keyPair.kid);
      expect(keyPair.privateJwk.kid).toBe(keyPair.kid);
      const expectedKid = await expectedKidFromPublicJwk(keyPair.publicJwk);
      expect(keyPair.kid).toBe(expectedKid);
    });
  });
});
