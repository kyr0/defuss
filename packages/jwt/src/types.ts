import type { JWK } from "jose";

export type IssueOptions = {
  sub: string; // subject
  ttlSec: number; // seconds until expiration
  scope?: string[]; // optional scopes
  nbfSec?: number; // optional not-before offset from now (seconds)
};

export type ValidationResult = {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
  scope?: string[];
};

export type StoredRecord = {
  id: string; // typically JTI
  revoked?: boolean;
  expHint?: number; // optional: when to auto-expire tombstone
  [k: string]: unknown;
};

export type Storage = {
  // REQUIRED by caller; library never persists tokens, only calls for tombstones
  getTokenFromStorage: (
    id: string,
  ) => StoredRecord | undefined | Promise<StoredRecord | undefined>;

  setTokenToStorage: (record: StoredRecord) => void | Promise<void>;
};

export type Policy = {
  iss?: string; // issuer to set & verify
  aud?: string | string[]; // audience to set & verify
  clockToleranceSec?: number; // default 60
};

export type Keys = {
  kid: string; // current signing KID
  privateJwk: JWK; // Ed25519 private JWK (for signing)
  publicJwk: JWK; // Ed25519 public JWK (for verification)
};

export type CreateAuthOptions = {
  storage: Storage; // REQUIRED
  now?: () => Date; // for testability
  enforceKid?: boolean; // require header.kid === keys.kid
  policy?: Policy; // claim policy
  // Optional additional public keys for verification during rotations
  extraPublicKeys?: Record<string, JWK>; // map kid -> public JWK
};
