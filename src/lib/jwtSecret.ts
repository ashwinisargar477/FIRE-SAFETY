import 'server-only';

/**
 * Secret for signing/verifying the session JWT. Server-only; never use NEXT_PUBLIC_.
 */
export function getJwtSecretBytes(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error('JWT_SECRET must be set and at least 16 characters');
  }
  return new TextEncoder().encode(s);
}
