export function splitIntoChunks(text: string, chunkSize = 1200, overlap = 200): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start += chunkSize - overlap;
  }

  return chunks.filter((chunk) => chunk.length > 80);
}
