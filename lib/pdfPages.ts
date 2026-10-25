import { parsePageSelection } from './pageRanges';

// Browser-only: turns selected pages of a PDF into JPEG images with pdf.js.
// pdf.js opens PDFs that are locked against copying or editing (common for
// owner's manuals), which PDF editing libraries can't. Only the chosen pages
// are rendered and uploaded.

/** Longest side of each page image, in pixels; enough for small table print. */
const PAGE_IMAGE_LONG_EDGE = 2000;
const JPEG_QUALITY = 0.82;

/** Fetches a manual PDF from its link through the admin-only route; the error says what went wrong. */
export async function fetchManualPdf(url: string): Promise<{ file: Blob } | { error: string }> {
  let response: Response;
  try {
    response = await fetch(`/api/admin/manual-pdf?url=${encodeURIComponent(url)}`);
  } catch {
    return { error: 'Couldn’t download the manual. Check your connection and try again.' };
  }
  if (!response.ok) {
    const message = (await response.text().catch(() => '')).slice(0, 200);
    return { error: message || `Couldn’t download the manual (${response.status}).` };
  }
  try {
    return { file: await response.blob() };
  } catch {
    return { error: 'The download stopped partway (the file may be over 150 MB). Try uploading the PDF instead.' };
  }
}

export async function renderPdfPages(
  file: Blob,
  selection: string
): Promise<{ pages: number[]; images: Blob[] } | { error: string }> {
  // Loaded on demand: pdf.js needs browser APIs, and most visits never import a manual.
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let pdf;
  try {
    pdf = await loadingTask.promise;
  } catch (error) {
    await loadingTask.destroy();
    if (error instanceof Error && error.name === 'PasswordException') {
      return { error: 'This PDF needs a password to open. Use a copy that opens without one.' };
    }
    return { error: 'That file couldn’t be opened as a PDF.' };
  }

  try {
    const parsed = parsePageSelection(selection, pdf.numPages);
    if ('error' in parsed) return parsed;

    const images: Blob[] = [];
    for (const pageNumber of parsed.pages) {
      const page = await pdf.getPage(pageNumber);
      const unscaled = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: PAGE_IMAGE_LONG_EDGE / Math.max(unscaled.width, unscaled.height) });

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport, background: 'rgb(255, 255, 255)' }).promise;

      const image = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
      page.cleanup();
      if (!image) return { error: `Couldn’t render page ${pageNumber}.` };
      images.push(image);
    }

    return { pages: parsed.pages, images };
  } finally {
    await loadingTask.destroy();
  }
}
