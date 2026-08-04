import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, derivedKey] = stored.split(":");
  if (!salt || !derivedKey) return false;
  const candidateKey = scryptSync(password, salt, KEY_LENGTH);
  const storedKey = Buffer.from(derivedKey, "hex");
  if (candidateKey.length !== storedKey.length) return false;
  return timingSafeEqual(candidateKey, storedKey);
}
