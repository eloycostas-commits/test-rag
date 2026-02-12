'use client';

import { useState } from 'react';

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

    setIsLoading(true);
    const body = new FormData();
    body.append('pdf', file);

    try {
      const response = await fetch('/api/upload', { method: 'POST', body });
      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Upload failed');
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
            {isLoading ? 'Indexing…' : 'Upload + Index'}
          </button>
        </div>
      </form>
      <p>{status}</p>
    </div>
  );
}
