'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const MAX_FILE_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 100);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const UPLOAD_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET ?? 'uploads-temp';

type ApiPayload = {
  message?: string;
  error?: string;
};

async function parseApiPayload(response: Response): Promise<ApiPayload> {
  const contentType = response.headers.get('content-type') ?? '';
  const raw = await response.text();

  if (!raw) return {};

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(raw) as ApiPayload;
    } catch {
      return { error: raw };
    }
  }

  return { error: raw };
}

export function PdfUploader() {
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem('pdf') as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      setStatus('Please select a PDF file.');
      return;
    }

    if (!file.type.includes('pdf')) {
      setStatus('Only PDF files are allowed.');
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

    try {
      const supabase = getSupabaseBrowserClient();
      const storagePath = `${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/\s+/g, '-')}`;

      const { error: uploadError } = await supabase.storage.from(UPLOAD_BUCKET).upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/pdf'
      });

      if (uploadError) throw uploadError;

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, storagePath })
      });

      const data = await parseApiPayload(response);

      if (!response.ok) {
        const defaultMessage = `Upload processing failed (${response.status}).`;
        throw new Error(data.error ?? defaultMessage);
      }

      setStatus(data.message ?? 'PDF uploaded and indexed.');
      form.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unknown error.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>1) Upload PDF documentation</h2>
      <form onSubmit={onSubmit}>
        <input name="pdf" type="file" accept="application/pdf" />
        <div style={{ marginTop: '0.75rem' }}>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Uploading + Indexing…' : 'Upload + Index'}
          </button>
        </div>
      </form>
      <p>{status}</p>
    </div>
  );
}
