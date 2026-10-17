import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from './email';
import { dailyReminderEmail, monthlySummaryEmail, type Email, type EmailLinks } from './reminderEmail';
import {
  isMonthlySummaryDay,
  lastMonthRange,
  planDailyReminders,
  planMonthlySummary,
  type DailyReminders,
  type ReminderRider,
} from './reminders';

// Server-only: the daily reminder run, called by /api/cron/reminders. Reads
// every rider's data through the `reminder_job_*` database functions (the job
// secret lets it in; the app holds no service-role key), claims each reminder
// before sending so none goes twice, and releases the claim if sending fails.

/** Stays under Resend's free plan (100 a day, sign-in emails included). Leftovers go tomorrow. */
const MAX_EMAILS_PER_RUN = 80;
/** Resend allows a few requests a second. */
const SEND_GAP_MS = 600;

export type UnsubscribeKind = 'daily' | 'monthly' | 'all';

export type ReminderJobResult = {
  riders: number;
  sent: number;
  failed: number;
  /** True if the run stopped at MAX_EMAILS_PER_RUN. */
  capped: boolean;
  errors: string[];
  /** Dry run only: what would be sent. */
  preview?: { to: string; subject: string; keys: string[] }[];
};

type Outgoing = { rider: ReminderRider; kind: 'daily' | 'monthly'; keys: string[]; build: (claimed: Set<string>) => Email };

function jobClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function linksFor(baseUrl: string, rider: ReminderRider, kind: UnsubscribeKind): EmailLinks & { oneClickUrl: string } {
  const query = `token=${encodeURIComponent(rider.email_token)}&type=${kind}`;
  return {
    appUrl: `${baseUrl}/`,
    settingsUrl: `${baseUrl}/?view=more`,
    unsubscribeUrl: `${baseUrl}/unsubscribe?${query}`,
    oneClickUrl: `${baseUrl}/api/unsubscribe?${query}`,
  };
}

/** Only the reminders whose keys were claimed. */
function onlyClaimed(reminders: DailyReminders, claimed: Set<string>): DailyReminders {
  return {
    tasks: reminders.tasks.filter((entry) => claimed.has(entry.key)),
    odometer: reminders.odometer.filter((entry) => claimed.has(entry.key)),
  };
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runReminderJob({ secret, today, baseUrl, dryRun, onlyEmail }: {
  secret: string;
  today: Date;
  /** Where links in the emails point, e.g. https://swingarm.app */
  baseUrl: string;
  dryRun: boolean;
  /** For trying it out: handle only the rider with this email address. */
  onlyEmail?: string | null;
}): Promise<ReminderJobResult> {
  const supabase = jobClient();
  const monthly = isMonthlySummaryDay(today) ? lastMonthRange(today) : null;

  const { data, error } = await supabase.rpc('reminder_job_data', {
    job_secret: secret,
    spend_from: monthly?.from ?? null,
    spend_to: monthly?.to ?? null,
  });
  if (error) throw new Error(`Couldn't read reminder data: ${error.message}`);
  const riders = ((data ?? []) as ReminderRider[]).filter(
    (rider) => !onlyEmail || rider.email.toLowerCase() === onlyEmail.toLowerCase()
  );

  const outgoing: Outgoing[] = [];
  for (const rider of riders) {
    const daily = planDailyReminders(rider, today);
    if (daily) {
      const links = linksFor(baseUrl, rider, 'daily');
      outgoing.push({
        rider,
        kind: 'daily',
        keys: [...daily.tasks, ...daily.odometer].map((entry) => entry.key),
        build: (claimed) => dailyReminderEmail(onlyClaimed(daily, claimed), rider.unit_system, links),
      });
    }
    const summary = planMonthlySummary(rider, today);
    if (summary) {
      const links = linksFor(baseUrl, rider, 'monthly');
      outgoing.push({ rider, kind: 'monthly', keys: [summary.key], build: () => monthlySummaryEmail(summary, rider.unit_system, links) });
    }
  }

  const result: ReminderJobResult = { riders: riders.length, sent: 0, failed: 0, capped: false, errors: [] };
  if (dryRun) {
    result.preview = outgoing.map((item) => ({ to: item.rider.email, subject: item.build(new Set(item.keys)).subject, keys: item.keys }));
    return result;
  }

  for (const item of outgoing) {
    if (result.sent + result.failed >= MAX_EMAILS_PER_RUN) {
      result.capped = true;
      break;
    }

    const claim = await supabase.rpc('claim_reminders', { job_secret: secret, rider: item.rider.user_id, keys: item.keys });
    if (claim.error) {
      result.failed += 1;
      result.errors.push(`claim for ${item.rider.user_id}: ${claim.error.message}`);
      continue;
    }
    const claimed = new Set((claim.data ?? []) as string[]);
    if (claimed.size === 0) continue; // Another run already sent these.

    const email = item.build(claimed);
    const links = linksFor(baseUrl, item.rider, item.kind);
    const sent = await sendEmail({
      to: item.rider.email,
      ...email,
      headers: {
        'List-Unsubscribe': `<${links.oneClickUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });

    if (sent.error) {
      result.failed += 1;
      result.errors.push(`send to ${item.rider.user_id}: ${sent.error}`);
      await supabase.rpc('release_reminders', { job_secret: secret, rider: item.rider.user_id, keys: [...claimed] });
    } else {
      result.sent += 1;
    }
    await pause(SEND_GAP_MS);
  }

  return result;
}
