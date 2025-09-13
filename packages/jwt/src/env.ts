import type { JWK } from "jose";

export function decodeB64UrlJSON<T>(s: string): T {
  return JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as T;
}

/**
 * Reads base64url-encoded JWKs and KID from env.
 * Vars:
 *  - DEFUSS_AUTH_PRIVATE_JWK
 *  - DEFUSS_AUTH_PUBLIC_JWK
 *  - DEFUSS_AUTH_KID
 */
export function getKeysFromEnv(): {
  publicJwk: JWK;
  privateJwk: JWK;
  kid: string;
} {
  const priv = process.env.DEFUSS_AUTH_PRIVATE_JWK;
  const pub = process.env.DEFUSS_AUTH_PUBLIC_JWK;
  const kid = process.env.DEFUSS_AUTH_KID;

  if (!priv || !pub || !kid) {
    throw new Error(
      "Missing DEFUSS_AUTH_* env vars. Run `npx defuss-auth gen-key`.",
    );
  }

  const privateJwk = decodeB64UrlJSON<JWK>(priv);
  const publicJwk = decodeB64UrlJSON<JWK>(pub);

  return { publicJwk, privateJwk, kid };
}
