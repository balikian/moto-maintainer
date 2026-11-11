import { sign } from 'node:crypto';

// Server-only (Node): the "secret key" Supabase's Apple provider needs for
// Sign in with Apple on the web and Android (Apple's web page). Apple doesn't
// issue one: it's a token (JWT) the app makes and signs with its Sign in with
// Apple key (the .p8 file from Apple's Certificates, Identifiers & Profiles),
// and Apple accepts it for at most six months. scripts/apple-client-secret.ts
// prints one to paste into Supabase, for each database.

/** Apple's limit on how long the secret lasts: about six months. */
export const APPLE_SECRET_MAX_SECONDS = 15_777_000;

/** How long ours last: 180 days, inside Apple's limit. */
export const APPLE_SECRET_SECONDS = 180 * 24 * 60 * 60;

export type AppleSecretInput = {
  /** The .p8 file's contents (PEM). */
  privateKey: string;
  /** The key's id (10 characters, shown with the key). */
  keyId: string;
  /** The developer account's Team ID. */
  teamId: string;
  /** The Services ID that signs in on the web, e.g. app.swingarm.signin. */
  clientId: string;
  /** Seconds since 1970; the secret starts now. */
  now: number;
};

const base64Url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** The signed secret (ES256 JWT), good for APPLE_SECRET_SECONDS from `now`. */
export function appleClientSecret({ privateKey, keyId, teamId, clientId, now }: AppleSecretInput): string {
  const unsigned = `${base64Url({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${base64Url({
    iss: teamId,
    iat: now,
    exp: now + APPLE_SECRET_SECONDS,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  })}`;
  // JWTs carry the raw 64-byte signature, not Node's default DER.
  const signature = sign('sha256', Buffer.from(unsigned), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${unsigned}.${signature}`;
}
