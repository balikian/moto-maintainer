// Prints the secret key for Supabase's Apple provider (lib/appleClientSecret.ts):
//
//   npm run apple:secret -- <path to the .p8 key> <key id> <team id> <services id>
//
// Paste it into Supabase → Authentication → Sign In / Providers → Apple →
// Secret Key (for OAuth), on each database. It expires after 180 days; make a
// new one before then (the date is printed below, and kept in ROADMAP.md).
// Keep the .p8 file outside the repo.
import { readFileSync } from 'node:fs';
import { APPLE_SECRET_SECONDS, appleClientSecret } from '../lib/appleClientSecret';

const [keyPath, keyId, teamId, clientId] = process.argv.slice(2);
if (!keyPath || !keyId || !teamId || !clientId) {
  console.error('Usage: npm run apple:secret -- <path to the .p8 key> <key id> <team id> <services id>');
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const secret = appleClientSecret({ privateKey: readFileSync(keyPath, 'utf8'), keyId, teamId, clientId, now });
const expires = new Date((now + APPLE_SECRET_SECONDS) * 1000).toISOString().slice(0, 10);

console.log(secret);
console.error(`\nExpires ${expires}. Make a new one before then.`);
