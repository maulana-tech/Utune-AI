import 'server-only';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { signToken, verifyToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from './session-token';

function requireSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET not set');
  return secret;
}

export function verifyPassword(input: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expected] = parts;
  const expectedBuf = Buffer.from(expected, 'hex');
  const derived = crypto.scryptSync(input, salt, expectedBuf.length);
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUser || !expectedHash) return false;
  const userBuf = Buffer.from(username);
  const expectedUserBuf = Buffer.from(expectedUser);
  if (userBuf.length !== expectedUserBuf.length) return false;
  if (!crypto.timingSafeEqual(userBuf, expectedUserBuf)) return false;
  return verifyPassword(password, expectedHash);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return verifyToken(requireSessionSecret(), token, SESSION_MAX_AGE);
}

export async function setSession(): Promise<void> {
  const token = await signToken(requireSessionSecret(), String(Math.floor(Date.now() / 1000)));
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}

export { SESSION_COOKIE_NAME };
