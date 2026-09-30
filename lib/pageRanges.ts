/** Most pages we'll send for one schedule import; the table is usually 2–6 pages. */
export const MAX_IMPORT_PAGES = 20;

/**
 * Parses a page selection like "84-87, 90" into sorted, unique, 1-based page
 * numbers. Returns an error message instead when the selection is invalid.
 */
export function parsePageSelection(input: string, pageCount: number): { pages: number[] } | { error: string } {
  const text = input.trim();
  if (!text) return { error: 'Enter the page numbers of the maintenance schedule, for example 84-87.' };

  const pages = new Set<number>();
  for (const part of text.split(',')) {
    const match = /^\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/.exec(part);
    if (!match) return { error: `"${part.trim()}" isn't a page number or range. Use a format like 84-87, 90.` };

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (start < 1 || end < start) return { error: `"${part.trim()}" isn't a valid range.` };
    if (end > pageCount) return { error: `This PDF only has ${pageCount} pages.` };
    if (end - start + 1 + pages.size > MAX_IMPORT_PAGES * 2) {
      return { error: `Please choose at most ${MAX_IMPORT_PAGES} pages.` };
    }

    for (let page = start; page <= end; page += 1) pages.add(page);
  }

  if (pages.size > MAX_IMPORT_PAGES) return { error: `Please choose at most ${MAX_IMPORT_PAGES} pages.` };
  return { pages: [...pages].sort((a, b) => a - b) };
}

/** e.g. [84, 85, 86, 90] → "84–86, 90", for the schedule's source note. */
export function formatPageList(pages: number[]): string {
  const ranges: string[] = [];
  for (let i = 0; i < pages.length; i += 1) {
    const start = pages[i];
    while (i + 1 < pages.length && pages[i + 1] === pages[i] + 1) i += 1;
    ranges.push(start === pages[i] ? String(start) : `${start}–${pages[i]}`);
  }
  return ranges.join(', ');
}
