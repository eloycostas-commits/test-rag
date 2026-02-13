import { ChatPanel } from '@/components/ChatPanel';
import { DocumentManager } from '@/components/DocumentManager';
import { PdfUploader } from '@/components/PdfUploader';

export default function HomePage() {
  return (
    <main>
      <h1>Prototipo RAG para Ingeniería Mecánica</h1>
      <p>
        Sube manuales técnicos, normativas legales y documentación de ascensores en PDF. Luego
        consulta la base de conocimiento con un chatbot impulsado por Groq + Supabase pgvector.
      </p>
      <PdfUploader />
      <ChatPanel />
      <DocumentManager />
    </main>
  );
}
