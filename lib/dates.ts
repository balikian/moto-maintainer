// Service dates are calendar days ("YYYY-MM-DD") with no time zone attached.
// Parsing them with `new Date('2026-09-29')` treats them as midnight UTC, which
// shows up as the previous day anywhere west of Greenwich, so everything here
// works in the user's local calendar instead.

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && parseIsoDate(value) !== null;
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIsoDate(): string {
  return toIsoDate(new Date());
}

/** Accepts "YYYY-MM-DD" (or a timestamp starting with it) and returns local midnight. */
export function parseIsoDate(value: string | null | undefined): Date | null {
  const match = value ? ISO_DATE_PATTERN.exec(value) : null;
  if (!match) return null;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 ? date : null;
}

/** Adds calendar months, clamping to the end of shorter months (Jan 31 + 1 month = Feb 28). */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDayOfMonth));
  return result;
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

const displayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatDisplayDate(value: string): string {
  const date = parseIsoDate(value);
  return date ? displayFormatter.format(date) : value;
}
