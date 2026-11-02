import { z } from 'zod';
import { readManualPages } from './scheduleExtraction';
import { SPEC_GROUPS, SPEC_KEYS, SPEC_UNITS, specValuesFromRows, UNITS, type SpecValues } from './specs';

// Reads a bike's specs (lib/specs.ts) out of owner's-manual pages with Claude.
// Server-only, like lib/scheduleExtraction.ts, whose Claude call it shares.

const ExtractedSpecRowSchema = z.object({
  key: z.enum(SPEC_KEYS),
  text: z.string().nullable(),
  value: z.number().nullable(),
  max: z.number().nullable(),
  unit: z.enum(SPEC_UNITS).nullable(),
  page: z.number().nullable(),
});

const ExtractedSpecsSchema = z.object({
  found_specs: z.boolean(),
  specs: z.array(ExtractedSpecRowSchema),
  notes: z.string(),
});

export type ExtractedSpecs = { found_specs: boolean; specs: SpecValues; notes: string };

const unitList = (kind: string) =>
  SPEC_UNITS.filter((unit) => UNITS[unit].kind === kind)
    .map((unit) => `${unit} (${UNITS[unit].label})`)
    .join(', ');

/** Each spec as a line for the prompt: "- oil_with_filter: Amount with filter (volume)". */
const SPEC_LINES = SPEC_GROUPS.map(
  (group) =>
    `${group.label}:\n${group.specs
      .map((spec) => `- ${spec.key}: ${spec.label} (${spec.kind}${'example' in spec ? `, like "${spec.example}"` : ''})`)
      .join('\n')}`
).join('\n');

const SYSTEM_PROMPT = `You read images of motorcycle owner's manual pages and extract the bike's specifications, so a rider's app can show them: the oil to buy, how much it takes, tire pressures, torques. A person reviews your result before it is saved, and riders tighten bolts and fill engines by these numbers, so accuracy matters more than completeness: only return values printed on the pages, exactly as printed, and never estimate or fill in a value from general knowledge.

The specs to look for, by key:
${SPEC_LINES}

How to fill in each row:
- One row per spec found; leave out specs the pages don't give. Use each key at most once.
- Text specs: put the value in text, as printed but tidy ("SAE 10W-40, JASO MA2", "DOT 4", "NGK LMAR8A-9"), and set value, max and unit to null. For the oil grade, include the viscosity and the standard or classification. For fuel, include the octane rating as printed (RON, AKI or both). For the chain, the size and link count. For sprockets, front/rear teeth like "15/45".
- Measured specs: put the number in value, the unit in unit, and text to null. For a range (chain slack 25–35 mm, valve clearance 0.10–0.15 mm) put the low end in value and the high end in max; otherwise max is null. Units for volume: ${unitList('volume')}. Pressure: ${unitList('pressure')}. Torque: ${unitList('torque')}. Length: ${unitList('length')}. If a value is printed in two units, use the first one listed.
- Tire pressures are cold pressures. "With a passenger" means the manual's two-up, with-passenger or full-load figure; riding alone is the plain front and rear pressure.
- Torques: only the fasteners listed. A torque table with many bolts may hold several of them; use the axle nut, not the axle pinch bolts, for the axle torques.
- Engine oil amounts: "with filter" is an oil and filter change, "without filter" an oil change alone. Don't use the total or dry-fill capacity for either; mention it in notes.
- page is the page number printed on the manual page where you read the value (often in a corner or footer), or null if none is visible.
- If the manual gives different values for markets, versions or riding conditions, use the standard one and say which others exist in notes.
- Use notes for anything the reviewer should check: values you weren't sure how to read, specs that didn't fit a key, or alternatives you left out.

If the pages don't contain specifications, set found_specs to false, return no rows, and say what the pages contain instead.`;

/** `pageImages` are base64 JPEGs of the selected manual pages, in page order. */
export async function extractSpecsFromPages(
  pageImages: string[],
  bike: { year: number; make: string; model: string }
): Promise<ExtractedSpecs> {
  const parsed = await readManualPages({
    pageImages,
    system: SYSTEM_PROMPT,
    request: `These ${pageImages.length} images are selected pages, in order, from the owner's manual for a ${bike.year} ${bike.make} ${bike.model}. Extract its specifications.`,
    schema: ExtractedSpecsSchema,
    what: 'specifications',
  });
  return { found_specs: parsed.found_specs, specs: specValuesFromRows(parsed.specs), notes: parsed.notes.trim() };
}
