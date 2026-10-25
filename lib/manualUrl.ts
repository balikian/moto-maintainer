import { isIP } from 'node:net';

// Checks for the admin's manual-PDF fetch (app/api/admin/manual-pdf): the
// server only fetches public web addresses, never its own network or the
// cloud provider's internal ones, even when a redirect points there.

/** A web link the server may fetch, or why not. */
export function parseManualUrl(value: string): { url: URL } | { error: string } {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return { error: 'That isn’t a web link.' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { error: 'Use a link starting with https://' };
  if (url.username || url.password) return { error: 'Links with a username or password aren’t supported.' };
  if (url.port && url.port !== '443' && url.port !== '80') return { error: 'Links to unusual ports aren’t supported.' };

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return { error: 'That link points to a private address.' };
  }
  if (isIP(host) && isPrivateAddress(host)) return { error: 'That link points to a private address.' };
  return { url };
}

function ipv4Parts(address: string): number[] | null {
  const parts = address.split('.').map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? parts : null;
}

/** True for loopback, private, link-local, carrier-grade NAT, multicast and other non-public addresses. */
export function isPrivateAddress(address: string): boolean {
  const lower = address.toLowerCase();
  // IPv4 written inside IPv6 (::ffff:10.0.0.1).
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const v4 = ipv4Parts(mapped ? mapped[1] : lower);
  if (v4) {
    const [a, b] = v4;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (isIP(lower) !== 6) return true;
  return (
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    /^fe[89ab]/.test(lower) ||
    lower.startsWith('ff') ||
    lower.startsWith('::ffff:')
  );
}
