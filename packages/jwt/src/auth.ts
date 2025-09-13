import type { JWK, JWTVerifyOptions } from "jose";
import { signJwt, verifyJwtWithKey, peekHeader } from "./crypto.js";
import type {
  CreateAuthOptions,
  IssueOptions,
  ValidationResult,
  Keys,
} from "./types.js";

/**
 * Create an auth instance with function-only API and pluggable storage.
 * - No token persistence on issuance.
 * - Revocation via tombstones: storage.setTokenToStorage({ id: jti, revoked: true, expHint? }).
 */
export function createAuth(keys: Keys, opts: CreateAuthOptions) {
  const policy = opts.policy ?? {};
  const clockTolerance = policy.clockToleranceSec ?? 60;
  const now = () => opts.now?.() ?? new Date();

  function selectPublicKeyForVerify(token: string): JWK {
    const hdr = peekHeader(token); // validates alg is EdDSA
    const kid = hdr.kid;

    if (opts.enforceKid) {
      if (!kid || kid !== keys.kid)
        throw new Error("Unexpected or missing kid");
      return keys.publicJwk;
    }

    // Try matching kid among provided keys; fall back to current publicJwk
    if (kid) {
      if (kid === keys.kid) return keys.publicJwk;
      const alt = opts.extraPublicKeys?.[kid];
      if (alt) return alt;
    }
    return keys.publicJwk;
  }

  async function issueToken({ sub, ttlSec, scope, nbfSec }: IssueOptions) {
    const iat = Math.floor(now().getTime() / 1000);
    const exp = iat + ttlSec;
    const nbf = nbfSec ? iat + nbfSec : undefined;

    const payload: Record<string, unknown> = { sub };
    if (scope?.length) payload.scope = scope;
    if (policy.iss) payload.iss = policy.iss;
    if (policy.aud) payload.aud = policy.aud;
    if (nbf !== undefined) payload.nbf = nbf;

    // IMPORTANT: do NOT persist tokens.
    const token = await signJwt(payload, keys.privateJwk, keys.kid, exp, iat);

    // Extract jti by verifying once against our current public key; policy asserted too.
    const verifyOpts: JWTVerifyOptions = {
      issuer: policy.iss,
      audience: policy.aud,
      clockTolerance,
    };
    const { payload: p } = await verifyJwtWithKey(
      token,
      keys.publicJwk,
      verifyOpts,
    );
    const jti = String(p.jti);

    return { token, jti, exp };
  }

  async function revokeToken(jti: string, expHint?: number) {
    // Tombstone only; let storage purge after exp.
    await opts.storage.setTokenToStorage({ id: jti, revoked: true, expHint });
  }

  async function validateToken(token: string): Promise<ValidationResult> {
    const verifyOpts: JWTVerifyOptions = {
      issuer: policy.iss,
      audience: policy.aud,
      clockTolerance,
    };
    const pub = selectPublicKeyForVerify(token);
    const { payload, protectedHeader } = await verifyJwtWithKey(
      token,
      pub,
      verifyOpts,
    );

    // Extra belt-and-suspenders checks
    const kid = protectedHeader.kid;
    if (opts.enforceKid && kid !== keys.kid) throw new Error("Unexpected kid");

    const jti = payload.jti ? String(payload.jti) : undefined;
    const sub = payload.sub ? String(payload.sub) : undefined;
    const exp = typeof payload.exp === "number" ? payload.exp : Number.NaN;
    const iat = typeof payload.iat === "number" ? payload.iat : Number.NaN;
    if (!jti || !sub || !Number.isFinite(exp) || !Number.isFinite(iat)) {
      throw new Error("Malformed token claims");
    }

    // Statefulness only via tombstones. If revoked -> reject.
    const tombstone = await opts.storage.getTokenFromStorage(jti);
    if (tombstone?.revoked) throw new Error("Token revoked");

    return {
      sub,
      jti,
      iat,
      exp,
      scope: Array.isArray((payload as any).scope)
        ? ((payload as any).scope as string[])
        : undefined,
    };
  }

  return Object.freeze({ issueToken, revokeToken, validateToken });
}
