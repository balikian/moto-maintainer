import type { UnitSystem } from './types';

// Bike specs: the numbers a rider looks up again and again (oil, tires,
// torques). The manual's values are shared per model (`model_specs`, reviewed
// like schedules); each bike keeps its own values on top (`motorcycles.specs`),
// for a different tire after a change or a spec the manual left out.
//
// Values with a unit keep the unit they were entered in, like the manual's
// schedule intervals, and are converted for display.

export type SpecKind = 'text' | 'volume' | 'pressure' | 'torque' | 'length';

type SpecDefinition = { key: string; label: string; kind: SpecKind; example?: string };

type SpecGroupDefinition = {
  id: string;
  label: string;
  /** Tasks whose names match get this group's specs shown on them. */
  tasks?: RegExp;
  specs: readonly SpecDefinition[];
};

export const SPEC_GROUPS = [
  {
    id: 'fuel',
    label: 'Fuel',
    specs: [
      { key: 'fuel_grade', label: 'Fuel grade', kind: 'text', example: 'Unleaded, 91 octane (95 RON)' },
      { key: 'fuel_ethanol', label: 'Ethanol limit', kind: 'text', example: 'E10' },
      { key: 'fuel_tank', label: 'Tank size', kind: 'volume' },
      { key: 'fuel_reserve', label: 'Reserve', kind: 'volume' },
    ],
  },
  {
    id: 'oil',
    label: 'Engine oil',
    // Not fork, final drive or gearbox oil, which have their own groups or none.
    tasks: /^(?!.*\b(fork|final drive|shaft|gear|transmission|primary)).*\boil\b/i,
    specs: [
      { key: 'oil_grade', label: 'Oil grade', kind: 'text', example: 'SAE 10W-40, JASO MA2' },
      { key: 'oil_with_filter', label: 'Amount with filter', kind: 'volume' },
      { key: 'oil_without_filter', label: 'Amount without filter', kind: 'volume' },
      { key: 'oil_filter', label: 'Oil filter', kind: 'text', example: 'Part number' },
      { key: 'oil_drain_torque', label: 'Drain plug torque', kind: 'torque' },
      { key: 'oil_filter_torque', label: 'Oil filter torque', kind: 'torque' },
    ],
  },
  {
    id: 'air',
    label: 'Air filter',
    tasks: /\bair (cleaner|filter)/i,
    specs: [{ key: 'air_filter', label: 'Air filter', kind: 'text', example: 'Part number' }],
  },
  {
    id: 'tires',
    label: 'Tires and wheels',
    tasks: /\b(tire|tyre|wheel)/i,
    specs: [
      { key: 'tire_front', label: 'Front tire', kind: 'text', example: '90/90-21' },
      { key: 'tire_rear', label: 'Rear tire', kind: 'text', example: '150/70-17' },
      { key: 'pressure_front', label: 'Front pressure', kind: 'pressure' },
      { key: 'pressure_rear', label: 'Rear pressure', kind: 'pressure' },
      { key: 'pressure_front_loaded', label: 'Front pressure, with a passenger', kind: 'pressure' },
      { key: 'pressure_rear_loaded', label: 'Rear pressure, with a passenger', kind: 'pressure' },
      { key: 'axle_front_torque', label: 'Front axle torque', kind: 'torque' },
      { key: 'axle_rear_torque', label: 'Rear axle torque', kind: 'torque' },
    ],
  },
  {
    id: 'chain',
    label: 'Chain drive',
    tasks: /\b(chain|sprocket)/i,
    specs: [
      { key: 'chain', label: 'Chain', kind: 'text', example: '525, 118 links' },
      { key: 'sprockets', label: 'Sprockets', kind: 'text', example: '15/45' },
      { key: 'chain_slack', label: 'Chain slack', kind: 'length' },
    ],
  },
  {
    id: 'shaft',
    label: 'Shaft drive',
    tasks: /\b(final drive|shaft)/i,
    specs: [
      { key: 'final_drive_oil', label: 'Final drive oil', kind: 'text', example: 'SAE 75W-90 hypoid' },
      { key: 'final_drive_oil_amount', label: 'Final drive oil amount', kind: 'volume' },
    ],
  },
  {
    id: 'cooling',
    label: 'Cooling',
    tasks: /\b(coolant|radiator|antifreeze)/i,
    specs: [
      { key: 'coolant', label: 'Coolant', kind: 'text', example: 'Silicate-free, 50/50' },
      { key: 'coolant_amount', label: 'Coolant amount', kind: 'volume' },
    ],
  },
  {
    id: 'brakes',
    label: 'Brakes and clutch',
    tasks: /\b(brake|caliper|clutch)/i,
    specs: [
      { key: 'brake_fluid', label: 'Brake fluid', kind: 'text', example: 'DOT 4' },
      { key: 'clutch_fluid', label: 'Clutch fluid', kind: 'text', example: 'DOT 4' },
      { key: 'caliper_torque', label: 'Caliper bolt torque', kind: 'torque' },
    ],
  },
  {
    id: 'suspension',
    label: 'Suspension',
    tasks: /\bfork/i,
    specs: [
      { key: 'fork_oil', label: 'Fork oil', kind: 'text', example: 'SAE 5W' },
      { key: 'fork_oil_amount', label: 'Fork oil per leg', kind: 'volume' },
      { key: 'fork_oil_level', label: 'Fork oil level', kind: 'length' },
    ],
  },
  {
    id: 'engine',
    label: 'Engine',
    tasks: /\bvalve/i,
    specs: [
      { key: 'valve_intake', label: 'Intake valve clearance', kind: 'length' },
      { key: 'valve_exhaust', label: 'Exhaust valve clearance', kind: 'length' },
    ],
  },
  {
    id: 'electrical',
    label: 'Electrical',
    tasks: /\b(spark plug|batter)/i,
    specs: [
      { key: 'spark_plug', label: 'Spark plug', kind: 'text', example: 'NGK LMAR8A-9' },
      { key: 'spark_plug_gap', label: 'Spark plug gap', kind: 'length' },
      { key: 'spark_plug_torque', label: 'Spark plug torque', kind: 'torque' },
      { key: 'battery', label: 'Battery', kind: 'text', example: 'YTZ10S' },
    ],
  },
] as const satisfies readonly SpecGroupDefinition[];

export type SpecGroup = (typeof SPEC_GROUPS)[number];
export type SpecKey = SpecGroup['specs'][number]['key'];

const DEFINITIONS = new Map<string, SpecDefinition>(SPEC_GROUPS.flatMap((group) => group.specs.map((spec) => [spec.key, spec])));

/** Every key, in the list's order. */
export const SPEC_KEYS = SPEC_GROUPS.flatMap((group) => group.specs.map((spec) => spec.key)) as [SpecKey, ...SpecKey[]];

export function isSpecKey(value: unknown): value is SpecKey {
  return typeof value === 'string' && DEFINITIONS.has(value);
}

export function specDefinition(key: SpecKey): SpecDefinition {
  return DEFINITIONS.get(key)!;
}

// --- Values --------------------------------------------------------------

export type SpecUnit = 'L' | 'mL' | 'qt' | 'floz' | 'kPa' | 'bar' | 'psi' | 'Nm' | 'kgfm' | 'lbft' | 'lbin' | 'mm' | 'in';

/** `page` is the manual's page the value came from. */
export type TextSpec = { text: string; page?: number };
/** A number, or a range like chain slack's 25–35 mm (`max`). */
export type MeasuredSpec = { value: number; max?: number; unit: SpecUnit; page?: number };
export type SpecValue = TextSpec | MeasuredSpec;
export type SpecValues = Partial<Record<SpecKey, SpecValue>>;

/** A spec the list doesn't have, added by the rider. */
export type CustomSpec = { label: string; text: string };

/** What `motorcycles.specs` holds: the rider's own values, over the manual's. */
export type BikeSpecs = { values?: SpecValues; custom?: CustomSpec[] };

type UnitInfo = {
  kind: Exclude<SpecKind, 'text'>;
  label: string;
  /** How many of this kind's base unit (mL, kPa, N·m, mm) one is. */
  base: number;
  system: UnitSystem | null;
  /** Decimals shown after converting to this unit. */
  digits: number;
};

export const UNITS: Record<SpecUnit, UnitInfo> = {
  L: { kind: 'volume', label: 'L', base: 1000, system: 'metric', digits: 2 },
  mL: { kind: 'volume', label: 'mL', base: 1, system: 'metric', digits: 0 },
  qt: { kind: 'volume', label: 'qt', base: 946.353, system: 'imperial', digits: 1 },
  floz: { kind: 'volume', label: 'fl oz', base: 29.5735, system: 'imperial', digits: 1 },
  kPa: { kind: 'pressure', label: 'kPa', base: 1, system: 'metric', digits: 0 },
  bar: { kind: 'pressure', label: 'bar', base: 100, system: 'metric', digits: 2 },
  psi: { kind: 'pressure', label: 'psi', base: 6.89476, system: 'imperial', digits: 0 },
  Nm: { kind: 'torque', label: 'N·m', base: 1, system: 'metric', digits: 1 },
  kgfm: { kind: 'torque', label: 'kgf·m', base: 9.80665, system: null, digits: 2 },
  lbft: { kind: 'torque', label: 'lb-ft', base: 1.35582, system: 'imperial', digits: 0 },
  lbin: { kind: 'torque', label: 'lb-in', base: 0.112985, system: 'imperial', digits: 0 },
  mm: { kind: 'length', label: 'mm', base: 1, system: 'metric', digits: 2 },
  in: { kind: 'length', label: 'in', base: 25.4, system: 'imperial', digits: 3 },
};

export const SPEC_UNITS = Object.keys(UNITS) as [SpecUnit, ...SpecUnit[]];

/** The units a kind of spec can be entered in, the rider's system's first. */
export function unitsFor(kind: Exclude<SpecKind, 'text'>, units: UnitSystem): SpecUnit[] {
  const ofKind = SPEC_UNITS.filter((unit) => UNITS[unit].kind === kind);
  return [...ofKind.filter((unit) => UNITS[unit].system === units), ...ofKind.filter((unit) => UNITS[unit].system !== units)];
}

export function isMeasured(value: SpecValue): value is MeasuredSpec {
  return 'unit' in value;
}

/** The unit a value is shown in for a rider: the right size of the rider's own units. */
function displayUnit(kind: UnitInfo['kind'], baseAmount: number, units: UnitSystem): SpecUnit {
  const metric = units === 'metric';
  switch (kind) {
    case 'volume':
      return metric ? (baseAmount >= 1000 ? 'L' : 'mL') : baseAmount >= 473 ? 'qt' : 'floz';
    case 'pressure':
      return metric ? 'kPa' : 'psi';
    case 'torque':
      return metric ? 'Nm' : baseAmount >= 13.5 ? 'lbft' : 'lbin';
    case 'length':
      return metric ? 'mm' : 'in';
  }
}

const number = (value: number, digits: number) => value.toLocaleString('en-US', { maximumFractionDigits: digits });

function formatIn(spec: MeasuredSpec, unit: SpecUnit): string {
  const from = UNITS[spec.unit];
  const to = UNITS[unit];
  const convert = (value: number) => (unit === spec.unit ? value : (value * from.base) / to.base);
  // As entered when not converted, so 0.15 mm stays 0.15.
  const digits = unit === spec.unit ? 3 : to.digits;
  const amount =
    spec.max === undefined ? number(convert(spec.value), digits) : `${number(convert(spec.value), digits)}–${number(convert(spec.max), digits)}`;
  return `${amount} ${to.label}`;
}

/**
 * A spec for display in the rider's units: "SAE 10W-40", "3.4 qt (3.2 L)".
 * Values entered in the other system show the original in parentheses.
 * Torques always show both, since wrenches come in either.
 */
export function formatSpec(spec: SpecValue, units: UnitSystem): string {
  if (!isMeasured(spec)) return spec.text;
  const info = UNITS[spec.unit];
  const shown = info.system === units ? spec.unit : displayUnit(info.kind, spec.value * info.base, units);
  if (shown !== spec.unit) return `${formatIn(spec, shown)} (${formatIn(spec, spec.unit)})`;
  if (info.kind !== 'torque') return formatIn(spec, spec.unit);
  const other = displayUnit(info.kind, spec.value * info.base, units === 'metric' ? 'imperial' : 'metric');
  return `${formatIn(spec, spec.unit)} (${formatIn(spec, other)})`;
}

/** The number part of a spec as typed in a form: "3.2", "25–35". */
export function specNumberText(spec: MeasuredSpec): string {
  return spec.max === undefined ? String(spec.value) : `${spec.value}–${spec.max}`;
}

/** Reads "3.2", "3,2", "25-35" or "0.10 – 0.15" as a number or range; null if it isn't one. */
export function parseSpecNumber(input: string): { value: number; max?: number } | null {
  const parts = input
    .trim()
    .split(/\s*(?:[-–—~]|to)\s*/)
    // "1,000" is a thousand; "3,2" and "0,15" are decimals written the European way.
    .map((part) => part.replace(/^([1-9]\d*),(\d{3})$/, '$1$2').replace(/^(\d+),(\d+)$/, '$1.$2'));
  if (parts.length > 2 || parts.some((part) => !/^\d*\.?\d+$/.test(part))) return null;
  const [value, max] = parts.map(Number);
  if (max === undefined) return { value };
  if (max < value) return null;
  return max === value ? { value } : { value, max };
}

/** A spec as typed in a form: the text, or a number or range plus its unit. */
export type SpecDraft = { text: string; unit: SpecUnit | null };

/** A form field's value: null when it's empty, 'invalid' when the number can't be read. */
export function specFromDraft(kind: SpecKind, draft: SpecDraft): SpecValue | null | 'invalid' {
  const text = draft.text.trim();
  if (!text) return null;
  if (kind === 'text') return { text };
  const amount = parseSpecNumber(text);
  return amount && draft.unit ? { ...amount, unit: draft.unit } : 'invalid';
}

// --- Checking what's saved ------------------------------------------------

export const MAX_SPEC_TEXT = 120;
export const MAX_CUSTOM_LABEL = 60;
export const MAX_CUSTOM_SPECS = 30;
const MAX_AMOUNT = 100_000;

const cleanText = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;

const cleanPage = (value: unknown) => (Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5000 ? (value as number) : undefined);

const cleanAmount = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_AMOUNT ? value : null;

/** One value, if it's well formed and fits the spec's kind; else null. */
export function cleanSpecValue(key: SpecKey, input: unknown): SpecValue | null {
  if (typeof input !== 'object' || input === null) return null;
  const raw = input as Record<string, unknown>;
  const page = cleanPage(raw.page);
  const kind = specDefinition(key).kind;

  if (kind === 'text') {
    const text = cleanText(raw.text, MAX_SPEC_TEXT);
    return text === null ? null : { text, ...(page && { page }) };
  }

  const unit = raw.unit as SpecUnit;
  const value = cleanAmount(raw.value);
  if (!SPEC_UNITS.includes(unit) || UNITS[unit].kind !== kind || value === null) return null;
  const max = raw.max === undefined ? undefined : cleanAmount(raw.max);
  if (max === null || (max !== undefined && max <= value)) return null;
  return { value, ...(max !== undefined && { max }), unit, ...(page && { page }) };
}

/** Only the known, well-formed values; anything else is dropped. */
export function cleanSpecValues(input: unknown): SpecValues {
  const values: SpecValues = {};
  if (typeof input !== 'object' || input === null) return values;
  for (const [key, raw] of Object.entries(input)) {
    if (!isSpecKey(key)) continue;
    const value = cleanSpecValue(key, raw);
    if (value) values[key] = value;
  }
  return values;
}

/** One spec as Claude reads it from the manual (lib/specExtraction.ts); `page` is the number printed on the page. */
export type ExtractedSpecRow = {
  key: SpecKey;
  text: string | null;
  value: number | null;
  max: number | null;
  unit: SpecUnit | null;
  page: number | null;
};

/** The manual's specs from Claude's rows: the first well-formed value for each key. */
export function specValuesFromRows(rows: ExtractedSpecRow[]): SpecValues {
  const values: SpecValues = {};
  for (const row of rows) {
    if (values[row.key]) continue;
    const page = row.page ?? undefined;
    const value =
      specDefinition(row.key).kind === 'text'
        ? cleanSpecValue(row.key, { text: row.text?.replace(/\s+/g, ' '), page })
        : cleanSpecValue(row.key, { value: row.value, max: row.max === null || row.max === row.value ? undefined : row.max, unit: row.unit, page });
    if (value) values[row.key] = value;
  }
  return values;
}

/** A bike's specs as saved: its own values and up to MAX_CUSTOM_SPECS rows of its own. */
export function cleanBikeSpecs(input: unknown): BikeSpecs {
  const raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const custom = (Array.isArray(raw.custom) ? raw.custom : [])
    .flatMap((row: unknown) => {
      if (typeof row !== 'object' || row === null) return [];
      const label = cleanText((row as Record<string, unknown>).label, MAX_CUSTOM_LABEL);
      const text = cleanText((row as Record<string, unknown>).text, MAX_SPEC_TEXT);
      return label && text ? [{ label, text }] : [];
    })
    .slice(0, MAX_CUSTOM_SPECS);
  return { values: cleanSpecValues(raw.values), custom };
}

// --- The specs a bike shows -------------------------------------------------

export type ResolvedSpec = {
  key: SpecKey;
  label: string;
  value: SpecValue;
  /** The manual's value, or one the rider entered (or changed) for this bike. */
  from: 'manual' | 'bike';
};

/** Each spec with a value: the bike's own, else the manual's. In the list's order. */
export function resolveSpecs(manual: SpecValues | null | undefined, bike: BikeSpecs | null | undefined): ResolvedSpec[] {
  return SPEC_GROUPS.flatMap((group) =>
    group.specs.flatMap((spec): ResolvedSpec[] => {
      const own = bike?.values?.[spec.key];
      if (own) return [{ key: spec.key, label: spec.label, value: own, from: 'bike' }];
      const fromManual = manual?.[spec.key];
      return fromManual ? [{ key: spec.key, label: spec.label, value: fromManual, from: 'manual' }] : [];
    })
  );
}

/** The spec groups that go with a task, by its name: "Replace engine oil and filter" → Engine oil. */
export function specGroupsForTask(taskName: string): SpecGroup[] {
  return SPEC_GROUPS.filter((group) => 'tasks' in group && group.tasks.test(taskName));
}

/** The groups with at least one value, each with its values. */
export function groupResolvedSpecs(specs: ResolvedSpec[]): { group: SpecGroup; specs: ResolvedSpec[] }[] {
  return SPEC_GROUPS.flatMap((group) => {
    const keys = new Set<string>(group.specs.map((spec) => spec.key));
    const inGroup = specs.filter((spec) => keys.has(spec.key));
    return inGroup.length > 0 ? [{ group, specs: inGroup }] : [];
  });
}
