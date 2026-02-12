import pdf from 'pdf-parse';
import { NextResponse } from 'next/server';
import { splitIntoChunks } from '@/lib/chunking';
import { getEmbedding } from '@/lib/openai';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing PDF file.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const parsed = await pdf(Buffer.from(bytes));
    const chunks = splitIntoChunks(parsed.text);

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No readable text found in PDF.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    for (const [index, chunk] of chunks.entries()) {
      const embedding = await getEmbedding(chunk);
      const { error } = await supabaseAdmin.from('documents').insert({
        title: file.name,
        chunk_index: index,
        content: chunk,
        embedding
      });

      if (error) throw error;
    }

    return NextResponse.json({ message: `Indexed ${chunks.length} chunks from ${file.name}.` });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process PDF.' },
      { status: 500 }
    );
  }
}
