import { randomBytes, pbkdf2 } from "node:crypto";
import { promisify } from "node:util";

// async variant of pbkdf2
const pbkdf2Async = promisify(pbkdf2);

export const deriveKey = async (password: string, salt: string): Promise<string> => {
  // using 16 bytes salt, 100000 iterations, 64-byte derived key, and sha512
  const derivedKey = await pbkdf2Async(password, salt, 100000, 64, 'sha512');
  return derivedKey.toString('hex');
};

/** 
 * Creates a salted PBKDF2 hash of the given password.
 * - @returns "salt:hash" as a single string
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt);
  return `${salt}:${key}`;
}

/**
 * Verifies a password against a stored "salt:hash" string.
 * - @returns true if the password matches, false otherwise
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, keyHex] = storedHash.split(':'); // neither salt nor keyHex can contain ':'
  if (!salt || !keyHex) {
    throw new Error('Invalid stored hash format. Must be "salt:hash".');
  }
  const derivedKey = await deriveKey(password, salt);
  return derivedKey === keyHex;
}