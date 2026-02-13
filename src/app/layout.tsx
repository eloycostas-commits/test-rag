import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prototipo RAG de Ingeniería Mecánica',
  description: 'Sube PDFs de ingeniería y consulta con chat sobre su contenido.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
