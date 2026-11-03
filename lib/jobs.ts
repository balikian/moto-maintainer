import { normalizeWebsite, readWebsite } from './shops';
import type { BikeJob, JobKind, ServiceLog } from './types';

// Repairs and upgrades (the `bike_jobs` table): one-time jobs planned for a
// bike, apart from its recurring maintenance tasks. A repair is something
// broken to fix; an upgrade is a mod or accessory, with an estimated cost and
// links to the products being compared. Logging one in Log service saves a
// service record that points at it (service_logs.job_id), which is what marks
// it done; deleting that record opens it again.

export const JOB_KINDS: { id: JobKind; label: string }[] = [
  { id: 'repair', label: 'Repair' },
  { id: 'upgrade', label: 'Upgrade' },
];

export function isJobKind(value: unknown): value is JobKind {
  return value === 'repair' || value === 'upgrade';
}

export function jobKindLabel(kind: JobKind): 'Repair' | 'Upgrade' {
  return kind === 'repair' ? 'Repair' : 'Upgrade';
}

/** The longest each field can be; the same limits are check constraints in the database. */
export const JOB_LIMITS = {
  name: 200,
  notes: 2000,
  links: 10,
  url: 500,
  label: 100,
} as const;

// bike_jobs.estimated_cost is numeric(10,2).
const MAX_COST = 99_999_999.99;

export type JobLink = { url: string; label: string | null };

export type JobFields = Pick<BikeJob, 'kind' | 'name' | 'notes' | 'estimated_cost'> & { links: JobLink[] };

/** What the form sends: each field as typed, blank for none. */
export type JobInput = {
  kind: string;
  name: string;
  notes: string;
  estimatedCost: string;
  links: { url: string; label: string }[];
};

const oneLine = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

/** A pasted product link as a full http(s) address (Google's redirect and utm_ tracking taken off); null if it isn't one. */
function readLink(text: string): string | null {
  const full = text ? normalizeWebsite(text) : null;
  const url = full ? normalizeWebsite(readWebsite(full)) : null;
  return url && url.length <= JOB_LIMITS.url ? url : null;
}

/** A saved job's links, skipping any that aren't usable (the column is checked loosely, and files can be edited). */
export function cleanJobLinks(value: unknown): JobLink[] {
  if (!Array.isArray(value)) return [];
  const links: JobLink[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const { url, label } = entry as Record<string, unknown>;
    const href = readLink(oneLine(url));
    if (!href) continue;
    links.push({ url: href, label: oneLine(label).slice(0, JOB_LIMITS.label) || null });
    if (links.length === JOB_LIMITS.links) break;
  }
  return links;
}

/** A typed cost: null when blank, NaN when it isn't a usable amount. */
function readCost(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const text = typeof value === 'number' ? String(value) : oneLine(value).replace(/^\$/, '').replace(/,/g, '');
  if (!text) return null;
  const amount = Number(text);
  return Number.isFinite(amount) && amount >= 0 && amount <= MAX_COST ? Math.round(amount * 100) / 100 : NaN;
}

/** The job as saved: trimmed, blanks as null, links made full addresses; or what's wrong with it. */
export function cleanJob(input: Partial<Record<keyof JobInput, unknown>>): { job: JobFields } | { error: string } {
  if (!isJobKind(input.kind)) return { error: 'Choose repair or upgrade.' };

  const name = oneLine(input.name);
  if (!name) return { error: 'Please say what it is.' };
  if (name.length > JOB_LIMITS.name) return { error: `Please keep the name under ${JOB_LIMITS.name} characters.` };

  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';
  if (notes.length > JOB_LIMITS.notes) return { error: `Please keep the notes under ${JOB_LIMITS.notes} characters.` };

  const estimatedCost = readCost(input.estimatedCost);
  if (Number.isNaN(estimatedCost)) return { error: 'Please enter the estimated cost as an amount, like 250.' };

  const links: JobLink[] = [];
  const typedLinks = (Array.isArray(input.links) ? input.links : []) as (Partial<Record<'url' | 'label', unknown>> | null)[];
  for (const entry of typedLinks) {
    const typedUrl = oneLine(entry?.url);
    const label = oneLine(entry?.label);
    if (!typedUrl && !label) continue;
    if (!typedUrl) return { error: `Add the address for “${label}”, or remove that link.` };
    const url = readLink(typedUrl);
    if (!url) return { error: `“${typedUrl.slice(0, 60)}” isn’t a web address SwingArm can open.` };
    if (label.length > JOB_LIMITS.label) return { error: `Please keep each link’s label under ${JOB_LIMITS.label} characters.` };
    links.push({ url, label: label || null });
  }
  if (links.length > JOB_LIMITS.links) return { error: `Up to ${JOB_LIMITS.links} links, please.` };

  return { job: { kind: input.kind, name, notes: notes || null, estimated_cost: estimatedCost, links } };
}

/** The form's starting values: a saved job's, or blank for a new one of this kind. */
export function jobInput(job?: BikeJob | null, kind: JobKind = 'repair'): JobInput {
  return {
    kind: job?.kind ?? kind,
    name: job?.name ?? '',
    notes: job?.notes ?? '',
    estimatedCost: job?.estimated_cost === null || job?.estimated_cost === undefined ? '' : String(Number(job.estimated_cost)),
    links: cleanJobLinks(job?.links).map((link) => ({ url: link.url, label: link.label ?? '' })),
  };
}

/** What a link shows as: its label, else the site's name ("revzilla.com"). */
export function linkLabel(link: JobLink): string {
  if (link.label) return link.label;
  try {
    return new URL(link.url).hostname.replace(/^www\./, '');
  } catch {
    return link.url;
  }
}

type DoneLog = Pick<ServiceLog, 'id' | 'job_id' | 'performed_at'>;

/**
 * The bike's jobs still to do (repairs first, then upgrades, oldest first in
 * each) and the done ones with the service record that finished them, newest first.
 */
export function splitJobs<L extends DoneLog>(jobs: BikeJob[], logs: L[]): { open: BikeJob[]; done: { job: BikeJob; log: L }[] } {
  const logsByJob = new Map<string, L>();
  for (const log of logs) if (log.job_id) logsByJob.set(log.job_id, log);

  const open = jobs
    .filter((job) => !logsByJob.has(job.id))
    .sort((a, b) => Number(b.kind === 'repair') - Number(a.kind === 'repair') || (a.created_at ?? '').localeCompare(b.created_at ?? ''));
  const done = jobs
    .flatMap((job) => {
      const log = logsByJob.get(job.id);
      return log ? [{ job, log }] : [];
    })
    .sort((a, b) => b.log.performed_at.localeCompare(a.log.performed_at));
  return { open, done };
}

/** The estimates added up, and how many jobs had one; null when none has one. */
export function estimatedTotal(jobs: Pick<BikeJob, 'estimated_cost'>[]): { total: number; priced: number } | null {
  let total = 0;
  let priced = 0;
  for (const job of jobs) {
    const cost = Number(job.estimated_cost);
    if (job.estimated_cost === null || !Number.isFinite(cost)) continue;
    total += cost;
    priced += 1;
  }
  return priced > 0 ? { total: Math.round(total * 100) / 100, priced } : null;
}
