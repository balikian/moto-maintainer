import { lookup } from 'node:dns/promises';
import type { NextRequest } from 'next/server';
import { isPrivateAddress, parseManualUrl } from '@/lib/manualUrl';
import { getSignedInClient } from '@/lib/supabase/server';

// Admin-only: fetches an owner's manual PDF from its link and streams it back,
// so the schedule import can read it without downloading and uploading it.
// Browsers can't fetch most manufacturer sites directly (CORS). Streaming
// avoids Vercel's 4.5 MB response limit. Only public web addresses are
// fetched, checked again on every redirect, and the answer is always served
// as a downloadable PDF, so nothing fetched can run as a page on this site.

export const maxDuration = 60;

const MAX_BYTES = 150 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 50_000;

/** The link, if it's a public web address; otherwise why not. */
async function checkPublic(value: string): Promise<URL | string> {
  const parsed = parseManualUrl(value);
  if ('error' in parsed) return parsed.error;
  const host = parsed.url.hostname.replace(/^\[|\]$/g, '');
  try {
    const addresses = await lookup(host, { all: true });
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
      return 'That link points to a private address.';
    }
  } catch {
    return 'Couldn’t find that website. Check the link.';
  }
  return parsed.url;
}

const plain = (message: string, status: number) =>
  new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

export async function GET(request: NextRequest) {
  const { supabase, user } = await getSignedInClient();
  if (!user) return plain('Sign in first.', 401);
  const { data: isAdmin } = await supabase.rpc('is_app_admin');
  if (!isAdmin) return plain('Only admins can import manuals by link.', 403);

  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  let target = request.nextUrl.searchParams.get('url') ?? '';
  let upstream: Response | null = null;
  for (let hop = 0; hop <= MAX_REDIRECTS && !upstream; hop += 1) {
    const checked = await checkPublic(target);
    if (typeof checked === 'string') return plain(checked, 400);
    let response: Response;
    try {
      response = await fetch(checked, {
        redirect: 'manual',
        signal,
        headers: { Accept: 'application/pdf,*/*;q=0.8', 'User-Agent': 'SwingArm manual import (+https://swingarm.app)' },
      });
    } catch {
      return plain('Couldn’t reach that website, or it took too long.', 502);
    }
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      target = new URL(location, checked).toString();
      continue;
    }
    upstream = response;
  }

  if (!upstream) return plain('That link redirects too many times.', 502);
  if (!upstream.ok || !upstream.body) return plain(`The website answered with an error (${upstream.status}).`, 502);
  if (Number(upstream.headers.get('content-length')) > MAX_BYTES) return plain('That file is over 150 MB.', 413);

  let received = 0;
  const limited = upstream.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > MAX_BYTES) controller.error(new Error('That file is over 150 MB.'));
        else controller.enqueue(chunk);
      },
    })
  );

  return new Response(limited, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="manual.pdf"',
      'Content-Security-Policy': 'sandbox',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  });
}
