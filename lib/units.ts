import type { UnitSystem } from './types';

// The database stores every distance in miles. These helpers convert at the
// edges: when showing a value, and when reading what the user typed.

const KM_PER_MILE = 1.609344;

export function distanceUnitLabel(units: UnitSystem): string {
  return units === 'metric' ? 'km' : 'mi';
}

export function toDisplayDistance(miles: number, units: UnitSystem): number {
  return Math.round(units === 'metric' ? miles * KM_PER_MILE : miles);
}

/** Converts a typed distance in the user's units to miles. Returns NaN for unparseable input. */
export function fromDisplayDistance(value: string | number, units: UnitSystem): number {
  const parsed = typeof value === 'number' ? value : parseFloat(value.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(parsed)) return NaN;
  return units === 'metric' ? parsed / KM_PER_MILE : parsed;
}

export function formatDistance(miles: number, units: UnitSystem): string {
  return `${toDisplayDistance(miles, units).toLocaleString()} ${distanceUnitLabel(units)}`;
}

/** Rounds a mileage to a whole number, or returns null if it isn't a valid non-negative number. */
export function normalizeMileage(value: number): number | null {
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}
