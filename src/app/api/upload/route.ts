import pdf from 'pdf-parse';
import { NextResponse } from 'next/server';
import { splitIntoChunks } from '@/lib/chunking';
import { getEnv } from '@/lib/env';
import { getEmbedding } from '@/lib/openai';
import { getSupabaseAdmin } from '@/lib/supabase';

const EMBEDDING_BATCH_SIZE = 10;
const MAX_SERVER_FILE_MB = 100;

export async function POST(request: Request) {
  let storagePath: string | null = null;
  const startedAt = Date.now();

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

    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only .pdf files are supported.' }, { status: 400 });
    }

    if (storagePath.length > 255) {
      return NextResponse.json({ error: 'Invalid storage path.' }, { status: 400 });
    }

    const env = getEnv();
    const supabaseAdmin = getSupabaseAdmin();

    console.info('[upload] downloading file', { fileName, storagePath });

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(env.SUPABASE_UPLOAD_BUCKET)
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message ?? 'Failed to download uploaded PDF from storage.');
    }

    if (!fileData.type.includes('pdf')) {
      throw new Error('Stored file is not recognized as PDF content.');
    }

    if (fileData.size > MAX_SERVER_FILE_MB * 1024 * 1024) {
      throw new Error(`File exceeds server processing limit (${MAX_SERVER_FILE_MB}MB).`);
    }

    const parsed = await pdf(Buffer.from(await fileData.arrayBuffer()));
    const chunks = splitIntoChunks(parsed.text);

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No readable text found in PDF.' }, { status: 400 });
    }

    for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);

      await Promise.all(
        batch.map(async (chunk, offset) => {
          const chunkIndex = start + offset;
          const embedding = await getEmbedding(chunk);
          const { error } = await supabaseAdmin.from('documents').insert({
            title: fileName,
            chunk_index: chunkIndex,
            content: chunk,
            embedding
          });

          if (error) {
            throw new Error(`Database insert failed for chunk ${chunkIndex}: ${error.message}`);
          }
        })
      );
    }

    await supabaseAdmin.storage.from(env.SUPABASE_UPLOAD_BUCKET).remove([storagePath]);

    const elapsedMs = Date.now() - startedAt;
    const stats = {
      pages: parsed.numpages ?? null,
      chunks: chunks.length,
      processingMs: elapsedMs,
      avgChunkLength: Math.round(chunks.reduce((acc, c) => acc + c.length, 0) / chunks.length)
    };

    console.info('[upload] indexed successfully', { fileName, ...stats });

    return NextResponse.json({
      message: `Indexed ${chunks.length} chunks from ${fileName}.`,
      stats
    });
  } catch (error) {
    if (storagePath) {
      try {
        const env = getEnv();
        await getSupabaseAdmin().storage.from(env.SUPABASE_UPLOAD_BUCKET).remove([storagePath]);
      } catch {
        // Best-effort cleanup.
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to process PDF.';
    console.error('[upload] failed', { storagePath, error: errorMessage });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
