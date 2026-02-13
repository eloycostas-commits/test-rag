'use client';

import { useEffect, useState } from 'react';

type IndexedDocument = {
  title: string;
  chunks: number;
  latestUploadAt: string;
};

export function DocumentManager() {
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function loadDocuments() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/documents');
      const data = (await response.json()) as {
        documents?: IndexedDocument[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? 'No se pudieron cargar los documentos');
      setDocuments(data.documents ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();

    const handler = () => {
      void loadDocuments();
    };

    window.addEventListener('documents-updated', handler);
    return () => window.removeEventListener('documents-updated', handler);
  }, []);

  async function deleteDocument(title: string) {
    const confirmed = window.confirm(`¿Eliminar todos los chunks indexados para "${title}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });

      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Falló la eliminación');

      setStatus(data.message ?? 'Documento eliminado');
      await loadDocuments();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error desconocido');
    }
  }

  return (
    <div className="card">
      <h2>3) Gestionar PDFs indexados</h2>
      <button onClick={() => void loadDocuments()} disabled={isLoading}>
        {isLoading ? 'Actualizando…' : 'Actualizar lista'}
      </button>
      {status ? <p>{status}</p> : null}

      {documents.length === 0 ? (
        <p className="muted">Aún no hay PDFs indexados.</p>
      ) : (
        <ul>
          {documents.map((doc) => (
            <li key={doc.title} style={{ marginTop: '0.75rem' }}>
              <strong>{doc.title}</strong> — {doc.chunks} chunks —{' '}
              {new Date(doc.latestUploadAt).toLocaleString()}
              <div>
                <button
                  style={{ marginTop: '0.4rem', background: '#b91c1c' }}
                  onClick={() => void deleteDocument(doc.title)}
                >
                  Eliminar datos del documento
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
