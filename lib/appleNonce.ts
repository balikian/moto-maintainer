/**
 * The nonce for Sign in with Apple in the iPhone app: a random value the site
 * keeps, whose SHA-256 goes to Apple. Apple puts the hash in its token, and
 * Supabase hashes the kept value to check the two match, so a stolen token
 * can't be replayed. Works in the browser and in Node (Web Crypto).
 */
export function randomNonce(bytes = 32): string {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
}

/** The SHA-256 of `text`, as lowercase hex: the form Apple and Supabase compare. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}
