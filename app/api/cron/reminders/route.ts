import type { NextRequest } from 'next/server';
import { runReminderJob } from '@/lib/reminderJob';
import { SITE_URL } from '@/lib/site';

// The daily reminder run (email and push). Vercel Cron calls it (vercel.json) with
// "Authorization: Bearer <CRON_SECRET>"; CRON_SECRET is also the job secret
// the database checks (Vault's reminder_job_secret), so it must match that
// environment's database. Cron runs only on production; to try it on the
// test site or locally, call it with the header yourself. Add ?dry-run to see
// what would be sent without sending or recording anything, and
// ?only=<email> to handle just that rider.

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const isProduction = process.env.VERCEL_ENV === 'production';
  const dryRun = request.nextUrl.searchParams.has('dry-run');
  const onlyEmail = request.nextUrl.searchParams.get('only');
  // The test database has real people's addresses too, so off production a
  // real send must name its one recipient.
  if (!isProduction && !dryRun && !onlyEmail) {
    return Response.json({ error: 'Off production, add ?only=<email> (or ?dry-run).' }, { status: 400 });
  }

  const baseUrl = isProduction ? SITE_URL : request.nextUrl.origin;
  try {
    const result = await runReminderJob({ secret, today: new Date(), baseUrl, dryRun, onlyEmail });
    if (result.errors.length > 0) console.error('Reminder emails: some failed', result.errors);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Reminder emails failed:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
