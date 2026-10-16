/** Saves text as a file through the browser's download. */
export function downloadFile(fileName: string, content: string, type: string) {
  // The byte-order mark makes Excel read CSV files as UTF-8 (accents, symbols).
  const parts = type.startsWith('text/csv') ? [String.fromCharCode(0xfeff), content] : [content];
  const url = URL.createObjectURL(new Blob(parts, { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
