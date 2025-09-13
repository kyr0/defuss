import { createHash, randomUUID } from "node:crypto";
import {
  type JWK,
  SignJWT,
  jwtVerify,
  importJWK,
  generateKeyPair,
  exportJWK,
  type JWTPayload,
  decodeProtectedHeader,
  type JWSHeaderParameters,
  type JWTVerifyOptions,
  calculateJwkThumbprint,
} from "jose";

export function sha256Base64Url(s: string) {
  return createHash("sha256").update(s).digest("base64url");
}

export async function genEd25519Pair() {
  const { publicKey, privateKey } = await generateKeyPair("EdDSA", {
    crv: "Ed25519",
    extractable: true,
  });
  const publicJwk = await exportJWK(publicKey);
  const privateJwk = await exportJWK(privateKey);
  // RFC 7638 thumbprint (base64url SHA-256); canonical and stable
  const kid = await calculateJwkThumbprint(publicJwk, "sha256");
  (publicJwk as any).kid = kid;
  (privateJwk as any).kid = kid;
  return { publicJwk, privateJwk, kid };
}

export async function signJwt(
  payload: Record<string, unknown>,
  privateJwk: JWK,
  kid: string,
  expEpoch: number,
  iatEpoch: number,
) {
  const key = await importJWK(privateJwk, "EdDSA");
  return await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "EdDSA", kid, typ: "JWT" })
    .setIssuedAt(iatEpoch)
    .setExpirationTime(expEpoch)
    .setJti(randomUUID())
    .sign(key);
}

/**
 * Verify a JWT with a provided public key and options.
 * Pins algorithms to EdDSA and enforces typical time/claim validations by jose.
 */
export async function verifyJwtWithKey(
  token: string,
  publicJwk: JWK,
  opts?: JWTVerifyOptions,
) {
  const key = await importJWK(publicJwk, "EdDSA");
  return await jwtVerify(token, key, {
    algorithms: ["EdDSA"],
    ...(opts ?? {}),
  });
}

/** Decode header (pre-verify) to select key safely (alg must be EdDSA). */
export function peekHeader(token: string): JWSHeaderParameters {
  const hdr = decodeProtectedHeader(token);
  if (hdr.alg !== "EdDSA") {
    throw new Error("Invalid alg (must be EdDSA)");
  }
  if (hdr.crv && hdr.crv !== "Ed25519") {
    throw new Error("Unsupported curve (must be Ed25519)");
  }
  return hdr;
}
