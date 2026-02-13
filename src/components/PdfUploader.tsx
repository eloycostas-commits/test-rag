'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const MAX_FILE_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 100);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const UPLOAD_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET ?? 'uploads-temp';

type UploadStats = {
  pages: number | null;
  chunks: number;
  processingMs: number;
  avgChunkLength: number;
};

type ApiPayload = {
  message?: string;
  error?: string;
  stats?: UploadStats;
};

async function parseApiPayload(response: Response): Promise<ApiPayload> {
  const contentType = response.headers.get('content-type') ?? '';
  const raw = await response.text();

  if (!raw) return {};
  if (!contentType.includes('application/json')) return { error: raw };

  try {
    return JSON.parse(raw) as ApiPayload;
  } catch {
    return { error: raw };
  }
}

export function PdfUploader() {
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);

  const tips = useMemo(
    () => [
      'Use searchable PDFs (not scanned images) for best retrieval quality.',
      'Prefer one topic per PDF for cleaner chunking and citations.',
      `Max upload configured: ${MAX_FILE_SIZE_MB}MB.`
    ],
    []
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem('pdf') as HTMLInputElement;
    const file = input.files?.[0];
    setUploadStats(null);

    if (!file) {
      setStatus('Please select a PDF file.');
      return;
    }

    if (!file.type.includes('pdf')) {
      setStatus('Only PDF files are allowed.');
      return;
    }

    if (file.size < 1024) {
      setStatus('The selected file is too small or invalid.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setStatus(
        `PDF too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). ` +
          `Configured max upload size is ~${MAX_FILE_SIZE_MB}MB.`
      );
      return;
    }

    setIsLoading(true);
    setProgress(5);

    try {
      const supabase = getSupabaseBrowserClient();
      const storagePath = `${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/\s+/g, '-')}`;

      setStatus('Uploading file to storage…');
      setProgress(25);

      const { error: uploadError } = await supabase.storage.from(UPLOAD_BUCKET).upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/pdf'
      });

      if (uploadError) throw uploadError;

      setStatus('Processing and indexing PDF…');
      setProgress(65);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, storagePath })
      });

      const data = await parseApiPayload(response);

      if (!response.ok) {
        throw new Error(data.error ?? `Upload processing failed (${response.status}).`);
      }

      setProgress(100);
      setStatus(data.message ?? 'PDF uploaded and indexed.');
      setUploadStats(data.stats ?? null);
      window.dispatchEvent(new Event('documents-updated'));
      form.reset();
      setSelectedFileName('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unknown error.');
      setProgress(0);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>1) Upload PDF documentation</h2>
      <form onSubmit={onSubmit}>
        <input
          name="pdf"
          type="file"
          accept="application/pdf"
          onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? '')}
        />

        {selectedFileName ? <p className="muted">Selected: {selectedFileName}</p> : null}

        <div className="progress-wrap" aria-label="upload progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Uploading + Indexing…' : 'Upload + Index'}
          </button>
        </div>
      </form>

      <p>{status}</p>

      {uploadStats ? (
        <div className="card nested">
          <strong>Upload stats</strong>
          <ul>
            <li>Pages: {uploadStats.pages ?? 'Unknown'}</li>
            <li>Chunks: {uploadStats.chunks}</li>
            <li>Avg chunk length: {uploadStats.avgChunkLength}</li>
            <li>Processing time: {(uploadStats.processingMs / 1000).toFixed(1)}s</li>
          </ul>
        </div>
      ) : null}

      <div className="card nested">
        <strong>Tips</strong>
        <ul>
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
