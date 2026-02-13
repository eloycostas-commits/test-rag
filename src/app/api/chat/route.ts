import { NextResponse } from 'next/server';
import { createChatCompletion, getEmbedding } from '@/lib/openai';
import { getSupabaseAdmin } from '@/lib/supabase';

type Source = {
  title: string;
  chunkIndex: number;
  similarity: number;
  excerpt: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { question?: string };
    const question = body.question?.trim();

    if (!question) {
      return NextResponse.json({ error: 'La pregunta es obligatoria.' }, { status: 400 });
    }

    if (question.length < 8) {
      return NextResponse.json(
        { error: 'La pregunta es demasiado corta. Añade más contexto.' },
        { status: 400 }
      );
    }

    if (question.length > 1200) {
      return NextResponse.json(
        { error: 'La pregunta es demasiado larga. Debe tener menos de 1200 caracteres.' },
        { status: 400 }
      );
    }

    const queryEmbedding = await getEmbedding(question);
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.2,
      match_count: 6
    });

    if (error) throw error;

    const rows = (data ?? []) as Array<{
      title: string;
      chunk_index: number;
      content: string;
      similarity: number;
    }>;

    if (rows.length === 0) {
      return NextResponse.json({
        answer:
          'No encontré fragmentos relevantes en los PDFs cargados. Intenta con términos más específicos (norma, componente o sección regulatoria).',
        sources: [] as Source[]
      });
    }

    const context = rows
      .map(
        (row, index) =>
          `[Source ${index + 1}] ${row.title} (chunk ${row.chunk_index}, score ${row.similarity.toFixed(3)})\n${row.content}`
      )
      .join('\n\n---\n\n');

    const answer = await createChatCompletion(question, context);

    const sources: Source[] = rows.map((row) => ({
      title: row.title,
      chunkIndex: row.chunk_index,
      similarity: Number(row.similarity.toFixed(4)),
      excerpt: row.content.slice(0, 200)
    }));

    return NextResponse.json({ answer, sources });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo responder la pregunta.' },
      { status: 500 }
    );
  }
}
