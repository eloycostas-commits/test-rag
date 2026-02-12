import pdf from 'pdf-parse';
import { NextResponse } from 'next/server';
import { splitIntoChunks } from '@/lib/chunking';
import { getEnv } from '@/lib/env';
import { getEmbedding } from '@/lib/openai';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  let storagePath: string | null = null;

  try {
    const body = (await request.json()) as { fileName?: string; storagePath?: string };
    const fileName = body.fileName?.trim();
    storagePath = body.storagePath?.trim() ?? null;

    if (!fileName || !storagePath) {
      return NextResponse.json(
        { error: 'fileName and storagePath are required.' },
        { status: 400 }
      );
    }

    const env = getEnv();
    const supabaseAdmin = getSupabaseAdmin();

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(env.SUPABASE_UPLOAD_BUCKET)
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message ?? 'Failed to download uploaded PDF from storage.');
    }

    const parsed = await pdf(Buffer.from(await fileData.arrayBuffer()));
    const chunks = splitIntoChunks(parsed.text);

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No readable text found in PDF.' }, { status: 400 });
    }

    for (const [index, chunk] of chunks.entries()) {
      const embedding = await getEmbedding(chunk);
      const { error } = await supabaseAdmin.from('documents').insert({
        title: fileName,
        chunk_index: index,
        content: chunk,
        embedding
      });

      if (error) throw error;
    }

    await supabaseAdmin.storage.from(env.SUPABASE_UPLOAD_BUCKET).remove([storagePath]);

    return NextResponse.json({ message: `Indexed ${chunks.length} chunks from ${fileName}.` });
  } catch (error) {
    if (storagePath) {
      try {
        const env = getEnv();
        await getSupabaseAdmin().storage.from(env.SUPABASE_UPLOAD_BUCKET).remove([storagePath]);
      } catch {
        // Best-effort cleanup.
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process PDF.' },
      { status: 500 }
    );
  }
}
