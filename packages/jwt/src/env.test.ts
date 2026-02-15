import { decodeB64UrlJSON, getKeysFromEnv } from "./env.js";

// Test helper function to temporarily set environment variables
function withEnv(
  envVars: Record<string, string | undefined>,
  callback: () => void,
): void {
  const originalEnv: Record<string, string | undefined> = {};

  // Store original values and set new ones
  for (const [key, value] of Object.entries(envVars)) {
    originalEnv[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    callback();
  } finally {
    // Restore original values
    for (const [key, originalValue] of Object.entries(originalEnv)) {
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    }
  }
}

describe("decodeB64UrlJSON", () => {
  it("decodes valid base64url JSON", () => {
    const obj = { foo: "bar", num: 42 };
    const encoded = Buffer.from(JSON.stringify(obj)).toString("base64url");
    const decoded = decodeB64UrlJSON<typeof obj>(encoded);
    expect(decoded).toEqual(obj);
  });

  it("handles complex objects", () => {
    const complex = {
      kty: "RSA",
      use: "sig",
      kid: "test-key-id",
      n: "some-long-modulus",
      e: "AQAB",
    };
    const encoded = Buffer.from(JSON.stringify(complex)).toString("base64url");
    const decoded = decodeB64UrlJSON<typeof complex>(encoded);
    expect(decoded).toEqual(complex);
  });

  it("throws on invalid base64url", () => {
    expect(() => decodeB64UrlJSON("invalid-base64!!!")).toThrow();
  });

  it("throws on invalid JSON", () => {
    const invalidJson = Buffer.from("{invalid json}").toString("base64url");
    expect(() => decodeB64UrlJSON(invalidJson)).toThrow();
  });

  it("handles empty object", () => {
    const empty = {};
    const encoded = Buffer.from(JSON.stringify(empty)).toString("base64url");
    const decoded = decodeB64UrlJSON<typeof empty>(encoded);
    expect(decoded).toEqual(empty);
  });
});

describe("getKeysFromEnv", () => {
  const mockPrivateJwk = {
    kty: "RSA",
    use: "sig",
    kid: "test-key",
    n: "mock-private-modulus",
    e: "AQAB",
    d: "mock-private-exponent",
  };

  const mockPublicJwk = {
    kty: "RSA",
    use: "sig",
    kid: "test-key",
    n: "mock-public-modulus",
    e: "AQAB",
  };

  const mockKid = "test-key-id";

  const validEnvVars = {
    DEFUSS_AUTH_PRIVATE_JWK: Buffer.from(
      JSON.stringify(mockPrivateJwk),
    ).toString("base64url"),
    DEFUSS_AUTH_PUBLIC_JWK: Buffer.from(JSON.stringify(mockPublicJwk)).toString(
      "base64url",
    ),
    DEFUSS_AUTH_KID: mockKid,
  };

  it("returns keys when all env vars are present", () => {
    withEnv(validEnvVars, () => {
      const result = getKeysFromEnv();
      expect(result.privateJwk).toEqual(mockPrivateJwk);
      expect(result.publicJwk).toEqual(mockPublicJwk);
      expect(result.kid).toBe(mockKid);
    });
  });

  it("throws when DEFUSS_AUTH_PRIVATE_JWK is missing", () => {
    withEnv(
      {
        DEFUSS_AUTH_PRIVATE_JWK: undefined,
        DEFUSS_AUTH_PUBLIC_JWK: validEnvVars.DEFUSS_AUTH_PUBLIC_JWK,
        DEFUSS_AUTH_KID: validEnvVars.DEFUSS_AUTH_KID,
      },
      () => {
        expect(() => getKeysFromEnv()).toThrow(
          "Missing DEFUSS_AUTH_* env vars. Run `bunx defuss-auth gen-key`.",
        );
      },
    );
  });

  it("throws when DEFUSS_AUTH_PUBLIC_JWK is missing", () => {
    withEnv(
      {
        DEFUSS_AUTH_PRIVATE_JWK: validEnvVars.DEFUSS_AUTH_PRIVATE_JWK,
        DEFUSS_AUTH_PUBLIC_JWK: undefined,
        DEFUSS_AUTH_KID: validEnvVars.DEFUSS_AUTH_KID,
      },
      () => {
        expect(() => getKeysFromEnv()).toThrow(
          "Missing DEFUSS_AUTH_* env vars. Run `bunx defuss-auth gen-key`.",
        );
      },
    );
  });

  it("throws when DEFUSS_AUTH_KID is missing", () => {
    withEnv(
      {
        DEFUSS_AUTH_PRIVATE_JWK: validEnvVars.DEFUSS_AUTH_PRIVATE_JWK,
        DEFUSS_AUTH_PUBLIC_JWK: validEnvVars.DEFUSS_AUTH_PUBLIC_JWK,
        DEFUSS_AUTH_KID: undefined,
      },
      () => {
        expect(() => getKeysFromEnv()).toThrow(
          "Missing DEFUSS_AUTH_* env vars. Run `bunx defuss-auth gen-key`.",
        );
      },
    );
  });

  it("throws when all env vars are missing", () => {
    withEnv(
      {
        DEFUSS_AUTH_PRIVATE_JWK: undefined,
        DEFUSS_AUTH_PUBLIC_JWK: undefined,
        DEFUSS_AUTH_KID: undefined,
      },
      () => {
        expect(() => getKeysFromEnv()).toThrow(
          "Missing DEFUSS_AUTH_* env vars. Run `bunx defuss-auth gen-key`.",
        );
      },
    );
  });

  it("throws when env vars are empty strings", () => {
    withEnv(
      {
        DEFUSS_AUTH_PRIVATE_JWK: "",
        DEFUSS_AUTH_PUBLIC_JWK: "",
        DEFUSS_AUTH_KID: "",
      },
      () => {
        expect(() => getKeysFromEnv()).toThrow(
          "Missing DEFUSS_AUTH_* env vars. Run `bunx defuss-auth gen-key`.",
        );
      },
    );
  });

  it("throws when private JWK has invalid base64url", () => {
    withEnv(
      {
        DEFUSS_AUTH_PRIVATE_JWK: "invalid-base64!!!",
        DEFUSS_AUTH_PUBLIC_JWK: validEnvVars.DEFUSS_AUTH_PUBLIC_JWK,
        DEFUSS_AUTH_KID: validEnvVars.DEFUSS_AUTH_KID,
      },
      () => {
        expect(() => getKeysFromEnv()).toThrow();
      },
    );
  });

  it("throws when public JWK has invalid base64url", () => {
    withEnv(
      {
        DEFUSS_AUTH_PRIVATE_JWK: validEnvVars.DEFUSS_AUTH_PRIVATE_JWK,
        DEFUSS_AUTH_PUBLIC_JWK: "invalid-base64!!!",
        DEFUSS_AUTH_KID: validEnvVars.DEFUSS_AUTH_KID,
      },
      () => {
        expect(() => getKeysFromEnv()).toThrow();
      },
    );
  });

  it("throws when private JWK has invalid JSON", () => {
    const invalidJson = Buffer.from("{invalid json}").toString("base64url");
    withEnv(
      {
        DEFUSS_AUTH_PRIVATE_JWK: invalidJson,
        DEFUSS_AUTH_PUBLIC_JWK: validEnvVars.DEFUSS_AUTH_PUBLIC_JWK,
        DEFUSS_AUTH_KID: validEnvVars.DEFUSS_AUTH_KID,
      },
      () => {
        expect(() => getKeysFromEnv()).toThrow();
      },
    );
  });

  it("throws when public JWK has invalid JSON", () => {
    const invalidJson = Buffer.from("{invalid json}").toString("base64url");
    withEnv(
      {
        DEFUSS_AUTH_PRIVATE_JWK: validEnvVars.DEFUSS_AUTH_PRIVATE_JWK,
        DEFUSS_AUTH_PUBLIC_JWK: invalidJson,
        DEFUSS_AUTH_KID: validEnvVars.DEFUSS_AUTH_KID,
      },
      () => {
        expect(() => getKeysFromEnv()).toThrow();
      },
    );
  });

  it("handles real-world JWK structures", () => {
    const realPrivateJwk = {
      kty: "RSA",
      use: "sig",
      key_ops: ["sign"],
      alg: "RS256",
      kid: "real-key-2024",
      n: "sRJjz_w...",
      e: "AQAB",
      d: "GRtbIQm...",
      p: "4kYLi9R...",
      q: "yNlXGY_...",
      dp: "BwKfV3_...",
      dq: "A1PzkGD...",
      qi: "AmB6saL...",
    };

    const realPublicJwk = {
      kty: "RSA",
      use: "sig",
      key_ops: ["verify"],
      alg: "RS256",
      kid: "real-key-2024",
      n: "sRJjz_w...",
      e: "AQAB",
    };

    withEnv(
      {
        DEFUSS_AUTH_PRIVATE_JWK: Buffer.from(
          JSON.stringify(realPrivateJwk),
        ).toString("base64url"),
        DEFUSS_AUTH_PUBLIC_JWK: Buffer.from(
          JSON.stringify(realPublicJwk),
        ).toString("base64url"),
        DEFUSS_AUTH_KID: "real-key-2024",
      },
      () => {
        const result = getKeysFromEnv();
        expect(result.privateJwk).toEqual(realPrivateJwk);
        expect(result.publicJwk).toEqual(realPublicJwk);
        expect(result.kid).toBe("real-key-2024");
      },
    );
  });
});
