import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

// Reads a maintenance schedule out of owner's-manual pages with Claude.
// Server-only: it uses ANTHROPIC_API_KEY, which must never reach the browser.

const ExtractedTask = z.object({
  task_name: z.string(),
  interval_distance: z.number(),
  distance_unit: z.enum(['km', 'mi']),
  interval_months: z.number(),
  is_diy: z.boolean(),
});

const ExtractedScheduleSchema = z.object({
  found_schedule: z.boolean(),
  tasks: z.array(ExtractedTask),
  notes: z.string(),
});

export type ExtractedTask = z.infer<typeof ExtractedTask>;
export type ExtractedSchedule = z.infer<typeof ExtractedScheduleSchema>;

const SYSTEM_PROMPT = `You read motorcycle owner's manual pages and extract the periodic maintenance schedule, so a rider's app can remind them when each job is due. A person reviews your result before it is saved, so accuracy matters more than completeness: never invent an interval that isn't printed on the pages.

How to read the schedule:
- Include recurring items only. Break-in or first-service-only items (for example "after the first 1,000 km") are not recurring; mention them in notes instead.
- Schedules are often grids of odometer columns with codes such as I (inspect), R (replace), L (lubricate), C (clean), A (adjust). An item's interval is the spacing between its repeating marks. If an item is inspected at one interval and replaced at another, return two tasks, for example "Brake fluid - inspect" and "Brake fluid - replace".
- For "whichever comes first" items, fill in both the distance and the months. If only one applies, set the other to 0.
- Use the distance unit the table is laid out in. If it shows both kilometers and miles, use whichever is listed first.
- Keep task names short and rider-friendly, close to the manual's wording.
- is_diy is true for routine owner jobs (oil and filter, chain, tires, lights, fluid levels) and false for jobs the manual assigns to a dealer or workshop, or that need special tools (for example valve clearance or throttle body synchronization).
- Use notes for anything the reviewer should know: severe-use or off-road variations, footnotes you couldn't fold into an interval, or items you weren't sure about.

If the pages don't contain a periodic maintenance schedule, set found_schedule to false, return no tasks, and say what the pages contain instead.`;

const MAX_TASKS = 80;

export class ScheduleExtractionError extends Error {}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ScheduleExtractionError('Schedule import isn’t set up yet: ANTHROPIC_API_KEY is missing on the server.');
  }
  // Reads ANTHROPIC_API_KEY from the environment.
  client ??= new Anthropic();
  return client;
}

/** Trims names, rounds numbers, and drops empty or nonsensical rows. */
function cleanTasks(tasks: ExtractedTask[]): ExtractedTask[] {
  return tasks
    .map((task) => ({
      task_name: task.task_name.replace(/\s+/g, ' ').trim().slice(0, 120),
      interval_distance: Number.isFinite(task.interval_distance) ? Math.max(0, Math.round(task.interval_distance)) : 0,
      distance_unit: task.distance_unit,
      interval_months: Number.isFinite(task.interval_months) ? Math.max(0, Math.round(task.interval_months)) : 0,
      is_diy: task.is_diy,
    }))
    .filter((task) => task.task_name && (task.interval_distance > 0 || task.interval_months > 0))
    .slice(0, MAX_TASKS);
}

export async function extractScheduleFromPdf(
  pdfBase64: string,
  bike: { year: number; make: string; model: string }
): Promise<ExtractedSchedule> {
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
        format: betaZodOutputFormat(ExtractedScheduleSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
            {
              type: 'text',
              text: `These pages are from the owner's manual for a ${bike.year} ${bike.make} ${bike.model}. Extract its periodic maintenance schedule.`,
            },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new ScheduleExtractionError('The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.local.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new ScheduleExtractionError('Too many requests right now. Wait a minute and try again.');
    }
    if (error instanceof Anthropic.BadRequestError) {
      throw new ScheduleExtractionError(`Claude couldn’t read that file: ${error.message}`);
    }
    if (error instanceof Anthropic.APIError) {
      throw new ScheduleExtractionError(`Claude is unavailable right now (error ${error.status}). Please try again.`);
    }
    throw error;
  }

  if (response.stop_reason === 'refusal') {
    throw new ScheduleExtractionError('Claude declined to read these pages. Try selecting only the maintenance schedule pages.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new ScheduleExtractionError('The schedule was too long to read in one go. Try fewer pages at a time.');
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new ScheduleExtractionError('Claude’s answer couldn’t be read. Please try again.');
  }

  return { found_schedule: parsed.found_schedule, tasks: cleanTasks(parsed.tasks), notes: parsed.notes.trim() };
}
