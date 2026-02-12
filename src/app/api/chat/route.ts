import { NextResponse } from 'next/server';
import { createChatCompletion, getEmbedding } from '@/lib/openai';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { question?: string };
    const question = body.question?.trim();

    if (!question) {
      return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
    }

    const queryEmbedding = await getEmbedding(question);
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.2,
      match_count: 5
    });

    if (error) throw error;

    const context = (data ?? [])
      .map((row: { title: string; content: string }) => `Source: ${row.title}\n${row.content}`)
      .join('\n\n---\n\n');

    const answer = await createChatCompletion(question, context);
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to answer question.' },
      { status: 500 }
    );
  }
}
