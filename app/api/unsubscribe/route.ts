import type { NextRequest } from 'next/server';
import { unsubscribeAction } from '@/lib/actions/unsubscribe';

// One-click unsubscribe (RFC 8058): mail apps POST here from the emails'
// List-Unsubscribe header. People who click the link in an email get the
// /unsubscribe page instead, which asks first.

export async function POST(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const result = await unsubscribeAction(params.get('token') ?? '', params.get('type') ?? '');
  return result.error ? new Response(result.error, { status: 400 }) : new Response('Unsubscribed');
}
