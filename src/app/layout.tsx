import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mechanical Engineering RAG Prototype',
  description: 'Upload engineering PDFs and chat with them using OpenAI + Supabase.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
