function normalizeWhitespace(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function removeDocumentNoise(value: string): string {
  return value
    .replace(/^\s*page\s+\d+(\s+of\s+\d+)?\s*$/gim, '')
    .replace(/^\s*\d+\s*$/gm, '')
    .replace(/^\s*(confidential|draft)\s*$/gim, '')
    .replace(/-{3,}/g, ' ')
    .replace(/_{3,}/g, ' ');
}

function splitSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ0-9])/g)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function overlapFromChunk(chunk: string, overlapSentences = 2): string {
  const sentences = splitSentences(chunk);
  if (sentences.length <= overlapSentences) return chunk;
  return sentences.slice(-overlapSentences).join(' ');
}

export function splitIntoChunks(text: string, chunkSize = 1200): string[] {
  const cleaned = normalizeWhitespace(removeDocumentNoise(text));
  const paragraphs = cleaned
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\n/g, ' ').trim())
    .filter((paragraph) => paragraph.length > 40);

  if (paragraphs.length === 0) return [];

  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length <= chunkSize) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
      const overlap = overlapFromChunk(current);
      current = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
      if (current.length <= chunkSize) continue;
    }

    const sentences = splitSentences(paragraph);
    let sentenceChunk = '';

    for (const sentence of sentences) {
      const candidate = sentenceChunk ? `${sentenceChunk} ${sentence}` : sentence;
      if (candidate.length <= chunkSize) {
        sentenceChunk = candidate;
        continue;
      }

      if (sentenceChunk) {
        chunks.push(sentenceChunk);
        const overlap = overlapFromChunk(sentenceChunk);
        sentenceChunk = overlap ? `${overlap} ${sentence}` : sentence;
      } else {
        chunks.push(sentence.slice(0, chunkSize));
        sentenceChunk = sentence.slice(chunkSize);
      }
    }

    current = sentenceChunk;
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks
    .map((chunk) => normalizeWhitespace(chunk))
    .filter((chunk, index, arr) => chunk.length > 80 && (index === 0 || arr[index - 1] !== chunk));
}
