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
      'Usa PDFs con texto seleccionable (no solo imágenes escaneadas).',
      'Mejor un tema por PDF para chunking y citas más limpias.',
      `Tamaño máximo configurado: ${MAX_FILE_SIZE_MB}MB.`
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
      setStatus('Selecciona un archivo PDF.');
      return;
    }

    if (!file.type.includes('pdf')) {
      setStatus('Solo se permiten archivos PDF.');
      return;
    }

    if (file.size < 1024) {
      setStatus('El archivo seleccionado es demasiado pequeño o inválido.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setStatus(
        `PDF demasiado grande (${(file.size / (1024 * 1024)).toFixed(2)}MB). ` +
          `El tamaño máximo configurado es ~${MAX_FILE_SIZE_MB}MB.`
      );
      return;
    }

    setIsLoading(true);
    setProgress(5);

    try {
      const supabase = getSupabaseBrowserClient();
      const storagePath = `${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/\s+/g, '-')}`;

      setStatus('Subiendo archivo al almacenamiento…');
      setProgress(25);

      const { error: uploadError } = await supabase.storage.from(UPLOAD_BUCKET).upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/pdf'
      });

      if (uploadError) throw uploadError;

      setStatus('Procesando e indexando PDF…');
      setProgress(65);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, storagePath })
      });

      const data = await parseApiPayload(response);

      if (!response.ok) {
        throw new Error(data.error ?? `Falló el procesamiento de la carga (${response.status}).`);
      }

      setProgress(100);
      setStatus(data.message ?? 'PDF subido e indexado correctamente.');
      setUploadStats(data.stats ?? null);
      window.dispatchEvent(new Event('documents-updated'));
      form.reset();
      setSelectedFileName('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error desconocido.');
      setProgress(0);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>1) Subir documentación PDF</h2>
      <form onSubmit={onSubmit}>
        <input
          name="pdf"
          type="file"
          accept="application/pdf"
          onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? '')}
        />

        {selectedFileName ? <p className="muted">Seleccionado: {selectedFileName}</p> : null}

        <div className="progress-wrap" aria-label="progreso de carga">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Subiendo + Indexando…' : 'Subir + Indexar'}
          </button>
        </div>
      </form>

      <p>{status}</p>

      {uploadStats ? (
        <div className="card nested">
          <strong>Estadísticas de carga</strong>
          <ul>
            <li>Páginas: {uploadStats.pages ?? 'Desconocido'}</li>
            <li>Chunks: {uploadStats.chunks}</li>
            <li>Longitud promedio de chunk: {uploadStats.avgChunkLength}</li>
            <li>Tiempo de procesamiento: {(uploadStats.processingMs / 1000).toFixed(1)}s</li>
          </ul>
        </div>
      ) : null}

      <div className="card nested">
        <strong>Consejos</strong>
        <ul>
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
