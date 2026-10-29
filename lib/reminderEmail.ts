import { bikeTitle } from './historyExport';
import {
  bikePath,
  dailyReminderPath,
  type DailyReminders,
  type MonthlySummary,
  type OdometerReminder,
  type ReminderBike,
  type TaskReminder,
} from './reminders';
import { dueLabel } from './taskLabels';
import type { UnitSystem } from './types';
import { formatDistance } from './units';

// The reminder emails' subject, HTML and plain text. Styled like the sign-in
// emails in supabase/templates/: light, inline styles, table layout.

export type Email = { subject: string; html: string; text: string };

export type EmailLinks = {
  /** Opens the app (Tasks); the daily email's links to a bike or Garage are made from it. */
  appUrl: string;
  /** More, where the reminder switches are. */
  settingsUrl: string;
  /** Turns off this kind of email. */
  unsubscribeUrl: string;
};

const COLORS = {
  page: '#f4f1ec',
  card: '#ffffff',
  text: '#1c1f23',
  muted: '#6b6460',
  line: '#e7e1d8',
  brand: '#8f1f18',
  onBrand: '#f2e4c9',
  arm: '#b5281f',
  danger: '#b5281f',
  warn: '#a15c00',
};
const FONT = "Manrope,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Longer lists end with "And 12 more", so a first email about a used bike stays readable. */
const MAX_TASKS_SHOWN = 8;

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** "640 mi left", "3 days overdue", "Due today". */
export function dueText(reminder: Pick<TaskReminder, 'dueState'>, units: UnitSystem): string {
  const { value, caption } = dueLabel(reminder.dueState, units);
  return value === 'Today' ? 'Due today' : `${value} ${caption}`;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export function dailySubject({ tasks, odometer }: DailyReminders): string {
  if (tasks.length === 1) {
    const [only] = tasks;
    return `${only.kind === 'overdue' ? 'Overdue' : 'Coming up'}: ${only.task.task_name} on your ${only.bike.model}`;
  }
  if (tasks.length > 1) {
    const overdue = tasks.filter((entry) => entry.kind === 'overdue').length;
    return overdue > 0 ? `${plural(tasks.length, 'maintenance task')} need attention` : `${plural(tasks.length, 'maintenance task')} coming up`;
  }
  return odometer.length === 1 ? `Time to update your ${odometer[0].bike.model}’s odometer` : 'Time to update your odometers';
}

/** Groups items by bike, keeping the order bikes first appear in. */
function byBike<T extends { bike: ReminderBike }>(items: T[]): { bike: ReminderBike; items: T[] }[] {
  const groups = new Map<string, { bike: ReminderBike; items: T[] }>();
  for (const item of items) {
    const group = groups.get(item.bike.id) ?? { bike: item.bike, items: [] };
    group.items.push(item);
    groups.set(item.bike.id, group);
  }
  return [...groups.values()];
}

function odometerSentence(reminder: OdometerReminder, units: UnitSystem): string {
  const { bike } = reminder;
  if (bike.current_mileage === null) {
    return `Your ${bikeTitle(bike)} doesn’t have an odometer reading yet. Add one so tasks with a mileage interval can come due.`;
  }
  return `The odometer on your ${bikeTitle(bike)} was last updated ${plural(reminder.daysSince, 'day')} ago, at ${formatDistance(bike.current_mileage, units)}.`;
}

// --- HTML pieces ---

// Sized for phones first: mail apps show this at the screen's width, so the
// padding is modest and each item stacks its due text under its name.

const paragraph = (html: string, style = '') =>
  `<tr><td style="font-size:14px;line-height:1.5;padding-bottom:14px;${style}">${html}</td></tr>`;

const heading = (text: string) =>
  `<tr><td style="font-size:16px;font-weight:700;line-height:1.3;padding:4px 0 8px;">${escapeHtml(text)}</td></tr>`;

const bikeLabel = (bike: ReminderBike) =>
  `<tr><td style="font-size:12px;font-weight:700;color:${COLORS.muted};padding:2px 0 6px;">${escapeHtml(bikeTitle(bike))}</td></tr>`;

function itemRow(name: string, detail: string, detailColor: string): string {
  return `<tr><td style="padding:0 0 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.line};border-radius:8px;"><tr>
<td style="padding:8px 10px;">
<div style="font-size:14px;font-weight:700;line-height:1.3;">${escapeHtml(name)}</div>
<div style="font-size:12px;font-weight:800;line-height:1.3;color:${detailColor};padding-top:2px;">${escapeHtml(detail)}</div>
</td>
</tr></table></td></tr>`;
}

const button = (href: string, label: string) =>
  `<tr><td style="padding:6px 0 20px;"><a href="${escapeHtml(href)}" style="display:inline-block;background:${COLORS.brand};color:${COLORS.onBrand};font-size:14px;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:8px;">${escapeHtml(label)}</a></td></tr>`;

function layout(rows: string, footer: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};padding:16px 8px;font-family:${FONT};color:${COLORS.text};">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${COLORS.card};border-radius:12px;padding:20px 16px;">
<tr><td style="padding-bottom:16px;">
<img src="https://swingarm.app/brand/swingarm-icon-512.png" width="32" height="32" alt="" style="vertical-align:middle;border-radius:7px;">
<span style="vertical-align:middle;margin-left:8px;font-size:17px;font-weight:800;letter-spacing:1px;">SWING<span style="color:${COLORS.arm};">ARM</span></span>
</td></tr>
${rows}
<tr><td style="font-size:12px;line-height:1.5;color:${COLORS.muted};border-top:1px solid ${COLORS.line};padding-top:16px;">${footer}</td></tr>
</table>
<p style="font-size:12px;color:${COLORS.muted};margin:12px 0 0;">SwingArm · <a href="https://swingarm.app" style="color:${COLORS.muted};">swingarm.app</a></p>
</td></tr>
</table>
</body></html>`;
}

function footer(reason: string, links: EmailLinks): { html: string; text: string } {
  return {
    html: `${escapeHtml(reason)} <a href="${escapeHtml(links.unsubscribeUrl)}" style="color:${COLORS.muted};">Turn off these emails</a> · <a href="${escapeHtml(links.settingsUrl)}" style="color:${COLORS.muted};">Email settings</a>`,
    text: `${reason}\nTurn off these emails: ${links.unsubscribeUrl}\nEmail settings: ${links.settingsUrl}`,
  };
}

export function dailyReminderEmail(reminders: DailyReminders, units: UnitSystem, links: EmailLinks): Email {
  const rows: string[] = [];
  const text: string[] = [];

  if (reminders.tasks.length > 0) {
    const overdue = reminders.tasks.some((entry) => entry.kind === 'overdue');
    rows.push(heading(overdue ? 'Maintenance that needs attention' : 'Maintenance coming up'));
    text.push(overdue ? 'MAINTENANCE THAT NEEDS ATTENTION' : 'MAINTENANCE COMING UP');
    const shown = reminders.tasks.slice(0, MAX_TASKS_SHOWN);
    for (const group of byBike(shown)) {
      rows.push(bikeLabel(group.bike));
      text.push('', bikeTitle(group.bike));
      for (const entry of group.items) {
        const detail = dueText(entry, units);
        rows.push(itemRow(entry.task.task_name, detail, entry.kind === 'overdue' ? COLORS.danger : COLORS.warn));
        text.push(`- ${entry.task.task_name}: ${detail}`);
      }
    }
    const hidden = reminders.tasks.length - shown.length;
    if (hidden > 0) {
      const more = `And ${hidden} more. Open SwingArm to see them all.`;
      rows.push(paragraph(escapeHtml(more), 'padding-bottom:8px;font-weight:700;'));
      text.push('', more);
    }
    const tip =
      'When it’s done, log the service so the countdown starts again. Tasks count from when the bike was new until you log one, so log the last service you know of.';
    rows.push(paragraph(escapeHtml(tip), `padding-top:8px;color:${COLORS.muted};`));
    text.push('', tip);
  }

  const bikes = byBike([...reminders.tasks, ...reminders.odometer]).map((group) => group.bike);
  const onlyOdometer = reminders.tasks.length === 0;

  if (reminders.odometer.length > 0) {
    rows.push(heading(reminders.odometer.length === 1 ? 'Time to update your odometer' : 'Time to update your odometers'));
    text.push('', 'TIME TO UPDATE YOUR ODOMETER');
    for (const entry of reminders.odometer) {
      const sentence = odometerSentence(entry, units);
      // About one bike, the button below opens its odometer; about several, each gets its own link.
      if (bikes.length > 1) {
        const href = new URL(bikePath(entry.bike.id, true), links.appUrl).href;
        const link = `<a href="${escapeHtml(href)}" style="color:${COLORS.brand};font-weight:700;">Update</a>`;
        rows.push(paragraph(`${escapeHtml(sentence)} ${link}`, 'padding-bottom:8px;'));
        text.push(`${sentence} Update: ${href}`);
      } else {
        rows.push(paragraph(escapeHtml(sentence), 'padding-bottom:8px;'));
        text.push(sentence);
      }
    }
    const distance = units === 'metric' ? 'kilometers' : 'miles';
    const why = `Distance-based tasks only count the ${distance} you’ve entered. Still the same? Tap Update and save the same reading, and we’ll check back in 30 days.`;
    rows.push(paragraph(escapeHtml(why), `color:${COLORS.muted};`));
    text.push(why);
  }

  const target = new URL(dailyReminderPath(reminders), links.appUrl).href;
  const label = bikes.length > 1 ? 'Open your garage' : onlyOdometer ? 'Update odometer' : `Open your ${bikes[0].model}`;
  rows.push(button(target, label));
  text.push('', `${label}: ${target}`);

  const foot = footer('You get these because task and odometer reminders are on.', links);
  text.push('', '--', foot.text);
  return { subject: dailySubject(reminders), html: layout(rows.join('\n'), foot.html), text: text.join('\n') };
}

// --- Admins: what's waiting for review ---

export type AdminReviewDigest = {
  admins: { user_id: string; email: string }[];
  manuals: { make: string; model: string; year_from: number; year_to: number; url: string; submitted_at: string }[];
  models: { make: string; model: string; submitted_at: string }[];
};

/** Where a submitted manual link points, by site only. The email never links to it: it's unreviewed. */
function linkDetail(url: string): string {
  try {
    const site = new URL(url).hostname;
    return site ? `Link to ${site}` : 'Not a valid web address';
  } catch {
    return 'Not a valid web address';
  }
}

const years = (from: number, to: number) => (from === to ? String(from) : `${from}–${to}`);

/** Null when nothing is waiting. */
export function adminReviewEmail(digest: Pick<AdminReviewDigest, 'manuals' | 'models'>, adminUrl: string): Email | null {
  const { manuals, models } = digest;
  const total = manuals.length + models.length;
  if (total === 0) return null;

  const rows: string[] = [paragraph(escapeHtml(`${plural(total, 'submission')} from riders ${total === 1 ? 'is' : 'are'} waiting for review.`))];
  const text: string[] = [`${plural(total, 'submission')} from riders ${total === 1 ? 'is' : 'are'} waiting for review.`];

  if (manuals.length > 0) {
    rows.push(heading(manuals.length === 1 ? 'Manual link' : 'Manual links'));
    text.push('', 'MANUAL LINKS');
    for (const manual of manuals.slice(0, MAX_TASKS_SHOWN)) {
      const name = `${years(manual.year_from, manual.year_to)} ${manual.make} ${manual.model}`;
      const detail = linkDetail(manual.url);
      rows.push(itemRow(name, detail, COLORS.muted));
      text.push(`- ${name}: ${detail}`);
    }
  }
  if (models.length > 0) {
    rows.push(heading(models.length === 1 ? 'New make or model' : 'New makes and models'));
    text.push('', 'NEW MAKES AND MODELS');
    for (const model of models.slice(0, MAX_TASKS_SHOWN)) {
      const name = `${model.make} ${model.model}`;
      rows.push(itemRow(name, 'Typed in by a rider', COLORS.muted));
      text.push(`- ${name}`);
    }
  }
  const hidden = Math.max(0, manuals.length - MAX_TASKS_SHOWN) + Math.max(0, models.length - MAX_TASKS_SHOWN);
  if (hidden > 0) {
    rows.push(paragraph(escapeHtml(`And ${hidden} more on the review page.`), 'padding-bottom:8px;font-weight:700;'));
    text.push('', `And ${hidden} more on the review page.`);
  }

  rows.push(button(adminUrl, 'Review submissions'));
  text.push('', `Review submissions: ${adminUrl}`);

  const reason = 'You get this because you’re a SwingArm admin. It comes each day something is waiting for review.';
  text.push('', '--', reason);
  return {
    subject: `${plural(total, 'submission')} to review`,
    html: layout(rows.join('\n'), escapeHtml(reason)),
    text: text.join('\n'),
  };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "October 2026" from "2026-10". */
export function monthName(month: string): string {
  const [year, number] = month.split('-').map(Number);
  return `${MONTHS[number - 1]} ${year}`;
}

export function monthlySummaryEmail(summary: MonthlySummary, units: UnitSystem, links: EmailLinks): Email {
  const name = monthName(summary.month);
  const rows: string[] = [paragraph(`<span style="font-size:18px;font-weight:700;">Your ${escapeHtml(name)} in SwingArm</span>`)];
  const text: string[] = [`YOUR ${name.toUpperCase()} IN SWINGARM`];

  for (const { bike, services, spent, needsAttention } of summary.bikes) {
    rows.push(heading(bikeTitle(bike)));
    text.push('', bikeTitle(bike));

    const logged = services === 0 ? `No service logged in ${MONTHS[Number(summary.month.slice(5)) - 1]}.` : `${plural(services, 'service')} logged, ${currency.format(spent)} spent.`;
    const odometer = bike.current_mileage === null ? 'No odometer reading yet.' : `Odometer: ${formatDistance(bike.current_mileage, units)}.`;
    rows.push(paragraph(escapeHtml(`${logged} ${odometer}`), 'padding-bottom:8px;'));
    text.push(`${logged} ${odometer}`);

    if (needsAttention.length === 0) {
      rows.push(paragraph('Nothing due soon.', `color:${COLORS.muted};`));
      text.push('Nothing due soon.');
      continue;
    }
    for (const { task, dueState } of needsAttention.slice(0, 5)) {
      const detail = dueText({ dueState }, units);
      rows.push(itemRow(task.task_name, detail, dueState.status === 'Overdue' ? COLORS.danger : COLORS.warn));
      text.push(`- ${task.task_name}: ${detail}`);
    }
    if (needsAttention.length > 5) {
      const more = `And ${needsAttention.length - 5} more.`;
      rows.push(paragraph(more, `color:${COLORS.muted};`));
      text.push(more);
    }
  }

  rows.push(button(links.appUrl, 'Open SwingArm'));
  text.push('', `Open SwingArm: ${links.appUrl}`);

  const foot = footer('You get this because the monthly summary is on.', links);
  text.push('', '--', foot.text);
  return { subject: `Your ${name} in SwingArm`, html: layout(rows.join('\n'), foot.html), text: text.join('\n') };
}
