// Invite links (supabase/migrations/20261121120000_founding_riders.sql):
// swingarm.app/join/<code>. Opening one saves the code in a cookie (proxy.ts),
// and the first page load after signing in redeems it, so it works whichever
// way the rider signs in: Google and Apple leave the site and come back, and
// the emailed link may open in another tab.

/** Lowercase letters and digits, as the invites table's check allows. */
const CODE_PATTERN = /^[a-z0-9]{6,32}$/;

/** No 0/o, 1/l/i, so a code read aloud or retyped survives. */
const CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

export const INVITE_CODE_LENGTH = 10;

/** The cookie that carries an opened invite's code until the rider is signed in. */
export const INVITE_COOKIE = 'swingarm_invite';

/** How long an opened invite waits for the rider to sign up: 30 days. */
export const INVITE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** A code as typed or pasted, or null if it can't be one. */
export function normalizeInviteCode(value: string | null | undefined): string | null {
  const code = (value ?? '').trim().toLowerCase();
  return CODE_PATTERN.test(code) ? code : null;
}

/** The code in a /join/<code> path, or null for any other path. */
export function inviteCodeFromPath(pathname: string): string | null {
  const match = /^\/join\/([^/]+)\/?$/.exec(pathname);
  return match ? normalizeInviteCode(decodeURIComponent(match[1])) : null;
}

/** A new random code. `randomValues` fills a byte array (crypto.getRandomValues). */
export function newInviteCode(randomValues: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes)): string {
  const bytes = randomValues(new Uint8Array(INVITE_CODE_LENGTH));
  // 31 characters, so 31^10 codes; the slight modulo bias doesn't matter here.
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

/** The link to send, on the given site (lib/site.ts). */
export function inviteUrl(siteUrl: string, code: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/join/${code}`;
}
