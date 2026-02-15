<h1 align="center">

<img src="https://github.com/kyr0/defuss/blob/main/assets/defuss_mascott.png?raw=true" width="100px" />

<p align="center">
  
  <code>defuss-jwt</code>

</p>

<sup align="center">

Ed25519 JWT key management library

</sup>

</h1>

<h3 align="center">
Overview
</h3>

defuss-jwt is a minimal, function-only Ed25519 JWT toolkit built on jose that emphasizes safe defaults:
- Algorithm pinned to EdDSA, OKP/Ed25519 only
- Deterministic kid via RFC 7638 JWK thumbprint
- Header peeking (alg/curve guarded) to choose keys before verification
- Stateless issuance (no persistence) and revocation via tombstones
- Time validations (exp/nbf/iat) with issuer/audience and clock tolerance
- Key rotation via extraPublicKeys; optional strict kid via enforceKid
- TypeScript-first, ESM

<h3 align="center">

Supported algorithms and JWT structure:

</h3>

```json
// Protected header (example)
{
  "alg": "EdDSA",
  "typ": "JWT",
  "kid": "RFC7638-thumbprint"
}

// Claims (example)
{
  "sub": "user-123",        // required by validateToken
  "jti": "uuid-v4",         // auto-set by signJwt; required by validateToken
  "iat": 1714761600,        // seconds since epoch
  "exp": 1714765200,        // required
  "nbf": 1714761630,        // optional (iat + nbfSec)
  "iss": "https://issuer",  // optional (policy.iss)
  "aud": "my-audience",     // optional (policy.aud)
  "scope": ["read", "write"]// optional array
}
```

- alg must be EdDSA; curve, if present, must be Ed25519 (enforced in peekHeader).
- validateToken requires sub, jti, numeric iat and exp.
- signJwt sets iat, exp, jti; you control sub/scope/nbf; iss/aud are injected via policy.

<h3 align="center">
Usage
</h3>

Install the package (Node.js 18+):

```bash
npm install defuss-jwt
# or
bun add defuss-jwt
# or
yarn add defuss-jwt
```

`defuss-jwt` provides a minimal, function-only Ed25519 JWT toolkit built on `jose` that emphasizes safe defaults and easy key management. Thus, you need a JWK key-pair to sign and verify tokens.

```bash
bunx defuss-jwt gen-keys
```

It writes the file: `.env.defuss_auth_keys` which contains:

```bash
DEFUSS_AUTH_PRIVATE_JWK=...
DEFUSS_AUTH_PUBLIC_JWK=...
DEFUSS_AUTH_KID=...
```

Key-pairs are read from the `process.env` as base64url-encoded JSON JWKs by default, so make sure you load them into your environment - e.g. using `defuss-env`'s `load` method. 

You can also generate and pass JWKs directly to the API.

<h4>Programmatic API</h4>

```typescript
import {
  genEd25519Pair,
  createAuth,
  verifyJwtWithKey,
  signJwt,
  peekHeader,
} from "defuss-jwt";

// Generate keys (kid is RFC 7638 thumbprint)
const keys = await genEd25519Pair();

// Create the auth instance (no token persistence; revocation via tombstones)
const auth = createAuth(keys, {
  storage: {
    async setTokenToStorage(t) { /* persist { id, revoked, expHint? } */ },
    async getTokenFromStorage(id) { /* return tombstone or undefined */ },
  },
  policy: {
    iss: "https://issuer.example.com",
    aud: "my-audience",
    clockToleranceSec: 60, // default is 60
  },
  // Optional: accept rotated keys
  extraPublicKeys: {
    // [oldKid]: oldPublicJwk
  },
  // Optional: require current kid in header
  enforceKid: true,
});

// Issue (no persistence)
const { token, jti, exp } = await auth.issueToken({
  sub: "user-123",
  ttlSec: 3600,
  scope: ["read", "write"],
  nbfSec: 30, // optional not-before (iat + 30s)
});

// Validate
const result = await auth.validateToken(token);
// => { sub, jti, iat, exp, scope? }

// Revoke (tombstone only)
await auth.revokeToken(jti, exp);
```


<h3 align="center">

API Reference

</h3>

#### genEd25519Pair(): Promise<{ publicJwk: JWK; privateJwk: JWK; kid: string }>

Generate an Ed25519 key pair. kid is the RFC 7638 SHA-256 thumbprint of the public JWK. The kid is set on both returned JWKs.

#### signJwt(payload, privateJwk, kid, expEpoch, iatEpoch): Promise<string>

Sign with EdDSA, header set to { alg: "EdDSA", typ: "JWT", kid }. Adds iat, exp, jti.

#### verifyJwtWithKey(token, publicJwk, opts?): Promise<JwtVerifyResult>

Verify with jose’s jwtVerify, restricted to algorithms: ["EdDSA"]. Pass issuer, audience, clockTolerance, etc. in opts.

#### peekHeader(token): JWSHeaderParameters

Decode the protected header without verification. Throws unless alg === "EdDSA" and crv (if present) is "Ed25519".

#### createAuth(keys, opts): { issueToken, revokeToken, validateToken }

- keys: { publicJwk: JWK; privateJwk: JWK; kid: string }
- opts:
  - storage: {
    - setTokenToStorage({ id, revoked, expHint? }): Promise<void>
    - getTokenFromStorage(id): Promise<{ id, revoked, expHint? } | undefined>
  }
  - policy?: { iss?: string; aud?: string; clockToleranceSec?: number }
  - extraPublicKeys?: Record<string, JWK>
  - enforceKid?: boolean
  - now?: () => Date // testing override

Methods:

- issueToken({ sub: string; ttlSec: number; scope?: string[]; nbfSec?: number })
  - Returns { token, jti, exp }. Internally self-verifies once (with policy) to normalize jti.
- revokeToken(jti: string, expHint?: number)
  - Tombstone only; use expHint for purge planning.
- validateToken(token: string): Promise<{ sub, jti, iat, exp, scope? }>
  - Peeks header to select key: enforceKid strictly matches current kid; otherwise tries current kid, then extraPublicKeys[kid], else falls back to current publicJwk.
  - Verifies with policy. Requires sub, jti, iat, exp. Rejects revoked tokens via storage lookup.

<h3 align="center">

Security Features

</h3>

- Algorithm pinning to EdDSA; rejects other algs during header peek
- Curve restriction to Ed25519 (OKP)
- Deterministic kid via JWK thumbprint (RFC 7638)
- Time validations: exp/nbf/iat with clock tolerance
- Optional kid enforcement to avoid unknown/rotated keys
- Stateless issuance; revocation through server-side tombstones

<h3 align="center">

Error Handling

</h3>

```typescript
import { signJwt, verifyJwtWithKey, peekHeader } from "defuss-jwt";

// Invalid algorithm in header
expect(() => peekHeader("eyJhbGciOiAiUlMyNTYifQ.payload.sig"))
  .toThrow("Invalid alg (must be EdDSA)");

// Expired token
await expect(verifyJwtWithKey(expiredToken, publicJwk)).rejects.toThrow();

// Malformed token claims (validateToken requires sub/jti/iat/exp)
await expect(auth.validateToken(await signJwt({}, privateJwk, kid, exp, iat)))
  .rejects.toThrow("Malformed token claims");
```

<p align="center">

  <img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" width="400px" />

</p>

<p align="center">
  <i><b>Come visit us on <code>defuss</code>