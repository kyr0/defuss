import {
  generateKeyPair,
  createPrivateKey,
  createPublicKey,
  type KeyObject,
  sign,
  verify as verifySignature,
  randomUUID,
} from 'node:crypto';
import { promisify } from 'node:util';

// async variant of generateKeyPair
const generateKeyPairAsync = promisify(generateKeyPair);

export interface JWTHeader {
  alg: string;
  typ: string;
}

export interface JWTPayload {
  iss?: string;  // Issuer (e.g., URL)
  sub?: string;  // Subject (e.g., user ID)
  aud?: string;  // Audience (e.g., client ID)
  exp?: number;  // Expiration time (strongly recommended, Unix time)
  nbf?: number;  // Not before (Unix time)
  iat?: number;  // Issued at (Unix time)
  jti: string;   // Token ID for revocation (unique identifier)
  [key: string]: unknown;
}

/**
 * Generates an RSA key pair (e.g., 4096 bits, exponent 65537).
 * - In production, store privateKey securely (environment variable / secrets manager).
 * - You can increase modulusLength to 4096 if you need stronger security.
 */
export async function createSecureKeyPair(): Promise<{
  privateKey: KeyObject;
  privateKeyBase64: string;
  publicKey: KeyObject;
  publicKeyBase64: string;
}> {
  const { privateKey, publicKey } = await generateKeyPairAsync('rsa', {
    modulusLength: 4096,
    publicExponent: 0x10001, // 65537 in decimal
  });
  return { privateKey, privateKeyBase64: keyToBase64(privateKey), publicKey, publicKeyBase64: keyToBase64(publicKey) };
}

/**
 * Converts a KeyObject (RSA) to a base64-encoded PEM string.
 */
export function keyToBase64(key: KeyObject): string {
  // For RSA, commonly used type is 'pkcs1'; for EC keys, 'sec1'.
  const pem = key.export({ type: 'pkcs1', format: 'pem' });
  return Buffer.from(pem).toString('base64');
}

/**
 * Converts a base64-encoded PEM string back into a KeyObject (RSA).
 * Use 'private' for the private key, 'public' for the public key.
 */
export function base64ToKeyObject(base64Pem: string, type: 'private' | 'public'): KeyObject {
  const pem = Buffer.from(base64Pem, 'base64').toString('utf8');
  return (type === 'private') ? createPrivateKey(pem) : createPublicKey(pem);
}

/** generates a cryptographically secure random UUID for  */
export const generateJti = () => randomUUID();

/**
 * Create a JWT token with RS256 signing:
 */
export function createToken(payload: JWTPayload, privateKey: KeyObject): string {
  const header: JWTHeader = { alg: 'RS256', typ: 'JWT' };

  // if no jti is provided, generate a unique identifier for the token
  if (!payload.jti) {
    payload.jti = generateJti();
  }

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = sign('sha256', Buffer.from(dataToSign), privateKey);
  const encodedSignature = toBase64Url(signature.toString('base64'));

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifies a JWT token:
 *  1) Validates header (alg = RS256, typ = JWT).
 *  2) Validates signature against the RSA public key.
 *  3) Checks jti is not revoked.
 *  4) Checks exp if present.
 */
export function verifyToken(token: string, publicKey: KeyObject, revokedTokenIds: Set<string>): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  // Decode and parse the header
  let header: JWTHeader;
  try {
    const headerString = bufferFromBase64Url(encodedHeader).toString('utf8');
    header = JSON.parse(headerString);
  } catch {
    console.error('Token header is JSON encoded.', encodedHeader);
    return false;
  }
  // reject anything other than RS256/JWT
  if (header.alg !== 'RS256' || header.typ !== 'JWT') {
    console.error('Token is not using algorithm RS256 or is not of type JWT.', header);
    return false;
  }

  // decode and parse the payload
  let payload: JWTPayload;
  try {
    const payloadString = bufferFromBase64Url(encodedPayload).toString('utf8');
    payload = JSON.parse(payloadString);
  } catch {
    console.error('Token is not JSON encoded.', encodedPayload);
    return false;
  }

  // check for missing jti
  if (!payload.jti) {
    console.error('Token is missing jti unqiue identifier:', payload);
    return false;
  }

  // check if jti is revoked
  if (payload.jti && revokedTokenIds.has(payload.jti)) {
    console.error('Token has been revoked:', payload.jti);
    return false;
  }

  // check expiration if present
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    console.error('Token has expired;', payload.exp);
    return false;
  }

  // recompute and verify the signature
  const signature = bufferFromBase64Url(encodedSignature);
  const dataToVerify = `${encodedHeader}.${encodedPayload}`;

  return verifySignature('sha256', Buffer.from(dataToVerify), publicKey, signature);
}

// ---------------------- Base64URL helpers ----------------------

function toBase64Url(input: string): string {
  return Buffer
    .from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function bufferFromBase64Url(input: string): Buffer {
  const base64 = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(input.length + (4 - (input.length % 4)) % 4, '=');
  return Buffer.from(base64, 'base64');
}
