import type { ServiceLog } from './types';

// Service records on the same day, at the same odometer and place, are one
// visit: a 12,000-mile service with its oil change, valve check and so on.
// Nothing stores the visit; the history groups records when it shows them.

export type VisitLog = Pick<ServiceLog, 'id' | 'task_id' | 'task_name' | 'performed_at' | 'odometer_at_service' | 'cost' | 'notes' | 'shop'>;

export type ServiceVisit<L extends VisitLog = VisitLog> = {
  key: string;
  /** YYYY-MM-DD */
  performedAt: string;
  odometer: number | null;
  shop: string | null;
  /** In the order given (newest first, as the history loads them). */
  logs: L[];
  /** Total of the recorded costs, or null when none has one. */
  cost: number | null;
  /** Each different note once, in order. */
  notes: string[];
};

export const SHOP_MAX_LENGTH = 80;

/** Trimmed, inner spaces collapsed, cut to the column's limit; null when blank. */
export function normalizeShop(value: string | null | undefined): string | null {
  const shop = (value ?? '').replace(/\s+/g, ' ').trim().slice(0, SHOP_MAX_LENGTH).trim();
  return shop || null;
}

function visitKey(log: VisitLog): string {
  const odometer = log.odometer_at_service === null ? '' : String(Number(log.odometer_at_service));
  return [log.performed_at.slice(0, 10), odometer, normalizeShop(log.shop)?.toLowerCase() ?? ''].join('|');
}

/** Groups service records into visits, in the order each visit first appears. */
export function groupServiceVisits<L extends VisitLog>(logs: L[]): ServiceVisit<L>[] {
  const visits = new Map<string, ServiceVisit<L>>();
  for (const log of logs) {
    const key = visitKey(log);
    let visit = visits.get(key);
    if (!visit) {
      visit = {
        key,
        performedAt: log.performed_at.slice(0, 10),
        odometer: log.odometer_at_service === null ? null : Number(log.odometer_at_service),
        shop: normalizeShop(log.shop),
        logs: [],
        cost: null,
        notes: [],
      };
      visits.set(key, visit);
    }
    visit.logs.push(log);
    const cost = log.cost === null ? NaN : Number(log.cost);
    if (Number.isFinite(cost)) visit.cost = (visit.cost ?? 0) + cost;
    const note = log.notes?.trim();
    if (note && !visit.notes.includes(note)) visit.notes.push(note);
  }
  return [...visits.values()];
}

/** Places to offer when logging: "Home" and the ones used before, most recent first. */
export function shopSuggestions(logs: Pick<ServiceLog, 'shop'>[], limit = 4): string[] {
  const seen = new Set<string>();
  const suggestions: string[] = [];
  for (const shop of ['Home', ...logs.map((log) => normalizeShop(log.shop))]) {
    if (!shop || seen.has(shop.toLowerCase())) continue;
    seen.add(shop.toLowerCase());
    suggestions.push(shop);
  }
  // "Home" stays first; the rest are the most recent places, already newest first.
  return suggestions.slice(0, limit);
}
