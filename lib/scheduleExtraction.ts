import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { cleanTasks } from './scheduleImport';
import { TASK_CATEGORY_IDS } from './taskCategories';

// Reads a maintenance schedule out of owner's-manual pages with Claude, and
// holds the Claude call the specs reader shares (lib/specExtraction.ts).
// Server-only: it uses ANTHROPIC_API_KEY, which must never reach the browser.

const ExtractedTask = z.object({
  task_name: z.string(),
  interval_distance: z.number(),
  distance_unit: z.enum(['km', 'mi']),
  interval_months: z.number(),
  is_diy: z.boolean(),
  category: z.enum(TASK_CATEGORY_IDS),
});

const ExtractedScheduleSchema = z.object({
  found_schedule: z.boolean(),
  tasks: z.array(ExtractedTask),
  notes: z.string(),
});

export type ExtractedTask = z.infer<typeof ExtractedTask>;
export type ExtractedSchedule = z.infer<typeof ExtractedScheduleSchema>;

const SYSTEM_PROMPT = `You read images of motorcycle owner's manual pages and extract the periodic maintenance schedule, so a rider's app can remind them when each job is due. A person reviews your result before it is saved, so accuracy matters more than completeness: never invent an interval that isn't printed on the pages.

How to read the schedule:
- Include recurring items only. Break-in or first-service-only items (for example "after the first 1,000 km") are not recurring; mention them in notes instead.
- Schedules are often grids of odometer columns with codes such as I (inspect), R (replace), L (lubricate), C (clean), A (adjust). An item's interval is the spacing between its repeating marks. If an item is inspected at one interval and replaced at another, return two tasks, for example "Brake fluid - inspect" and "Brake fluid - replace".
- For "whichever comes first" items, fill in both the distance and the months. If only one applies, set the other to 0.
- Use the distance unit the table is laid out in. If it shows both kilometers and miles, use whichever is listed first.
- Keep task names short and rider-friendly, close to the manual's wording. Start every name with the action as a verb, then the part: "Check brake discs", "Replace front brake fluid", "Clean fork dust boots", "Lubricate chain". Use "Replace" for change/renew/replace, "Check" for inspect/check, and keep the same name every time you read the same row, because the app matches tasks by name when a schedule is re-imported.
- is_diy answers: could a typical home mechanic with ordinary hand tools do this job? Judge from the job itself. Manufacturers mark most scheduled work with workshop symbols or "have this done by an authorized dealer" wording for liability and warranty reasons, so don't let those symbols or that wording decide it. Brake fluid changes, brake pad and disc checks, chain work, air filters, spark plugs, coolant and fork dust boots are DIY. Set is_diy to false only for jobs that need dealer diagnostic software, special equipment or specialist skill, such as valve clearance, fuel pressure checks, or suspension internals.
- Dealer-only steps that aren't maintenance a rider tracks (reading out fault memory with the dealer diagnostics tool, programming sensors, resetting the service display, entering proof of service in a dealer portal, the final test ride) should not be separate tasks. Fold them into a single "Dealer service inspection" task (is_diy false) at the shortest recurring interval they appear at.
- category groups related jobs so a rider can do them in one visit: engine (oil, valves, spark plugs, air filter, fuel system), brakes (fluid, pads, discs, lines, brake levers), drivetrain (chain, sprockets, belt, final drive, clutch), wheels (tires, rims, spokes, wheel bearings), suspension (forks, shocks, steering head, swingarm, frame), cooling (coolant, radiator, fan), electrical (battery, lights, electrical checks), controls (cables, levers, lubricating pivots and moving parts), other (hoses, fasteners, the dealer inspection, anything else).
- Use notes for anything the reviewer should know: severe-use or off-road variations, footnotes you couldn't fold into an interval, or items you weren't sure about.

If the pages don't contain a periodic maintenance schedule, set found_schedule to false, return no tasks, and say what the pages contain instead.`;

/** A failure to show the admin as is: a missing key, a refusal, Claude being unavailable. */
export class ManualReadError extends Error {}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ManualReadError('Importing from manuals isn’t set up yet: ANTHROPIC_API_KEY is missing on the server.');
  }
  // Reads ANTHROPIC_API_KEY from the environment.
  client ??= new Anthropic();
  return client;
}

/**
 * Sends manual pages to Claude with a system prompt and reads its answer into
 * `schema`. Shared by the schedule reader here and the specs reader
 * (lib/specExtraction.ts). `what` names the result in error messages.
 */
export async function readManualPages<T extends z.ZodType>({
  pageImages,
  system,
  request,
  schema,
  what,
}: {
  /** Base64 JPEGs of the selected manual pages, in page order. */
  pageImages: string[];
  system: string;
  /** The text after the images: what to read from them. */
  request: string;
  schema: T;
  what: string;
}): Promise<z.infer<T>> {
  const anthropic = getClient();

  let response;
  try {
    response = await anthropic.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // If a safety filter declines, the API retries on a suitable fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'high',
        format: betaZodOutputFormat(schema),
      },
      system,
      messages: [
        {
          role: 'user',
          content: [
            ...pageImages.map((data) => ({
              type: 'image' as const,
              source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data },
            })),
            { type: 'text', text: request },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new ManualReadError('The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.local.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new ManualReadError('Too many requests right now. Wait a minute and try again.');
    }
    if (error instanceof Anthropic.BadRequestError) {
      throw new ManualReadError(`Claude couldn’t read that file: ${error.message}`);
    }
    if (error instanceof Anthropic.APIError) {
      throw new ManualReadError(`Claude is unavailable right now (error ${error.status}). Please try again.`);
    }
    throw error;
  }

  if (response.stop_reason === 'refusal') {
    throw new ManualReadError(`Claude declined to read these pages. Try selecting only the ${what} pages.`);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new ManualReadError(`The ${what} was too long to read in one go. Try fewer pages at a time.`);
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new ManualReadError('Claude’s answer couldn’t be read. Please try again.');
  }
  return parsed;
}

/** `pageImages` are base64 JPEGs of the selected manual pages, in page order. */
export async function extractScheduleFromPages(
  pageImages: string[],
  bike: { year: number; make: string; model: string }
): Promise<ExtractedSchedule> {
  const parsed = await readManualPages({
    pageImages,
    system: SYSTEM_PROMPT,
    request: `These ${pageImages.length} images are selected pages, in order, from the owner's manual for a ${bike.year} ${bike.make} ${bike.model}. Extract its periodic maintenance schedule.`,
    schema: ExtractedScheduleSchema,
    what: 'maintenance schedule',
  });
  return { found_schedule: parsed.found_schedule, tasks: cleanTasks(parsed.tasks), notes: parsed.notes.trim() };
}
