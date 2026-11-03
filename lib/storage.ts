import { daysBetween, isFutureEverywhere, isIsoDate, parseIsoDate } from './dates';

// Storage mode: a bike put away for the season. Putting it in storage brings
// up a checklist (battery, fuel, tires, cover, insurance); while it's stored,
// the daily reminder job asks about the battery every few weeks; taking it out
// brings up a "back on the road" checklist. Ticks are saved on the bike
// (`motorcycles.storage_checklist`), so the rider can work through them over
// a few days.

export type BatteryType = 'standard' | 'lithium';

export const BATTERY_TYPES: { value: BatteryType; label: string }[] = [
  { value: 'standard', label: 'Lead-acid, AGM or gel' },
  { value: 'lithium', label: 'Lithium' },
];

/** Weeks in storage between battery check-ins. */
export const STORAGE_CHECK_IN_DAYS = 28;

export type ChecklistItem = { key: string; label: string; detail: string };

/** Getting the bike ready to sit. The battery item depends on the battery: lithium shouldn't sit on a plain trickle charger. */
export function storageChecklist(battery: BatteryType | null): ChecklistItem[] {
  return [
    battery === 'lithium'
      ? {
          key: 'battery',
          label: 'Charge the battery, then disconnect it',
          detail:
            'Charge it fully with a lithium-safe charger, then disconnect it or take it out. Don’t leave it on a regular trickle charger: its desulfation mode can damage a lithium battery.',
        }
      : {
          key: 'battery',
          label: 'Put the battery on a maintainer',
          detail:
            'A battery maintainer (smart trickle charger) keeps it topped up. No power where the bike is? Take the battery out and keep it charged at home.' +
            (battery === null ? ' If it’s lithium, use a lithium-safe charger instead.' : ''),
        },
    {
      key: 'fuel',
      label: 'Fill the tank and add fuel stabilizer',
      detail: 'A full tank keeps moisture and rust out. Run the engine a few minutes so the stabilized fuel reaches the injectors or carbs.',
    },
    {
      key: 'oil',
      label: 'Change the oil if it’s close to due',
      detail: 'Used oil holds acids that sit in the engine all season. Fresh oil now means one less job in spring.',
    },
    {
      key: 'wash',
      label: 'Wash it, dry it and lube the chain',
      detail: 'Dirt and road salt hold moisture against paint and metal. Lube the chain afterward, if it has one.',
    },
    {
      key: 'tires',
      label: 'Pump the tires to full pressure',
      detail: 'Tires lose pressure as they sit. A stand keeps flat spots off them.',
    },
    {
      key: 'cover',
      label: 'Plug the exhaust and cover it',
      detail: 'A breathable cover, and a plug or rag in the exhaust and air intake against mice. Leave yourself a note to take them out.',
    },
    {
      key: 'insurance',
      label: 'Ask your insurer about storage coverage',
      detail: 'Many insurers offer cheaper “lay-up” or comprehensive-only coverage while a bike is put away.',
    },
  ];
}

/** Before the first ride after storage. Keys start with `road:` so they sit beside the storage ticks. */
export function roadChecklist(battery: BatteryType | null): ChecklistItem[] {
  return [
    {
      key: 'road:insurance',
      label: 'Restore full insurance coverage',
      detail: 'If you switched to storage coverage, before your first ride.',
    },
    {
      key: 'road:battery',
      label: 'Charge and reconnect the battery',
      detail:
        (battery === 'lithium' ? 'With a lithium-safe charger. ' : '') + 'Check the terminals are clean and tight.',
    },
    {
      key: 'road:plugs',
      label: 'Take out the exhaust and intake plugs',
      detail: 'And check the airbox and under the cover for nests.',
    },
    {
      key: 'road:tires',
      label: 'Check tire pressure and condition',
      detail: 'Set them to your riding pressures, and look for cracks or flat spots.',
    },
    {
      key: 'road:brakes',
      label: 'Check the brakes and fluids',
      detail: 'Squeeze the levers, check the brake fluid, oil and coolant levels, and look under the bike for leaks.',
    },
    {
      key: 'road:chain',
      label: 'Clean and lube the chain',
      detail: 'If it has one, and check its slack.',
    },
    {
      key: 'road:lights',
      label: 'Check the lights, horn and signals',
      detail: 'Then an easy first ride: brakes and tires take a few miles to feel right.',
    },
  ];
}

const KNOWN_KEYS = new Set([...storageChecklist(null), ...roadChecklist(null)].map((item) => item.key));

/** The ticked items as saved: known keys only, each once. */
export function cleanStorageChecklist(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  return [...new Set(keys.filter((key): key is string => typeof key === 'string' && KNOWN_KEYS.has(key)))];
}

export function cleanBatteryType(value: unknown): BatteryType | null {
  return value === 'standard' || value === 'lithium' ? value : null;
}

/** A battery spec like "Shido LTZ10S lithium" or "LiFePO4" says it's lithium; anything else says nothing. */
export function guessBatteryType(specText: string | null | undefined): BatteryType | null {
  return specText && /lithium|li-?ion|lifepo|\blfp\b/i.test(specText) ? 'lithium' : null;
}

/** The day it went into storage, or an error: a real calendar day, not in the future. */
export function checkStoredOn(value: unknown, isFuture: (day: string) => boolean = isFutureEverywhere): string | { error: string } {
  if (typeof value !== 'string' || !isIsoDate(value)) return { error: 'Pick the day it went into storage.' };
  if (isFuture(value)) return { error: 'The storage date can’t be in the future.' };
  return value;
}

/** Whole weeks in storage by `today`, or 0 before the first full week. */
export function weeksInStorage(storedOn: string, today: Date): number {
  const stored = parseIsoDate(storedOn);
  return stored ? Math.max(0, Math.floor(daysBetween(stored, today) / 7)) : 0;
}

/** Which battery check-in is due (1, 2, …), or 0 before the first. */
export function storageCheckInPeriod(storedOn: string, today: Date): number {
  const stored = parseIsoDate(storedOn);
  return stored ? Math.max(0, Math.floor(daysBetween(stored, today) / STORAGE_CHECK_IN_DAYS)) : 0;
}

/** "4 weeks", "2 months", "1 year" in storage. */
export function storageDuration(storedOn: string, today: Date): string {
  const weeks = weeksInStorage(storedOn, today);
  if (weeks < 9) return weeks === 1 ? '1 week' : `${weeks} weeks`;
  const stored = parseIsoDate(storedOn)!;
  const months = Math.floor(daysBetween(stored, today) / 30.44);
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year' : `${years} years`;
}

/** The battery check-in's advice, after "Your Norden 901 has been in storage 4 weeks." */
export function batteryCheckAdvice(battery: BatteryType | null): string {
  return battery === 'lithium'
    ? 'Lithium batteries hold their charge, but the bike can drain one slowly. Check its charge and top it up with a lithium-safe charger if it’s low.'
    : 'Is the battery still on its maintainer? If not, give it a charge so it doesn’t go flat.' +
        (battery === null ? ' If it’s lithium, use a lithium-safe charger.' : '');
}
