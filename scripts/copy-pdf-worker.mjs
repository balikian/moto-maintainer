// Runs after `npm install`. pdf.js decodes PDFs in a Web Worker, which the
// browser loads from /pdf.worker.min.mjs, so the worker must sit in public/
// and match the installed pdfjs-dist version.
import { copyFileSync } from 'node:fs';

copyFileSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'public/pdf.worker.min.mjs');
console.log('Copied the pdf.js worker to public/pdf.worker.min.mjs');
