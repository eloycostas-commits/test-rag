import { ChatPanel } from '@/components/ChatPanel';
import { DocumentManager } from '@/components/DocumentManager';
import { PdfUploader } from '@/components/PdfUploader';

export default function HomePage() {
  return (
    <main>
      <h1>Mechanical Engineering RAG prototype</h1>
      <p>
        Upload technical manuals, legal regulations, and elevator documentation in PDF format. Then
        query the knowledge base with a chatbot powered by Groq + Supabase pgvector.
      </p>
      <PdfUploader />
      <DocumentManager />
      <ChatPanel />
    </main>
  );
}
