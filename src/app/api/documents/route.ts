import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

type DocumentRow = {
  title: string;
  created_at: string;
};

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('documents')
      .select('title, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const grouped = new Map<string, { title: string; chunks: number; latestUploadAt: string }>();

    for (const row of (data ?? []) as DocumentRow[]) {
      const current = grouped.get(row.title);
      if (!current) {
        grouped.set(row.title, { title: row.title, chunks: 1, latestUploadAt: row.created_at });
      } else {
        current.chunks += 1;
        if (row.created_at > current.latestUploadAt) current.latestUploadAt = row.created_at;
      }
    }

    return NextResponse.json({ documents: Array.from(grouped.values()) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list documents.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { title?: string };
    const title = body.title?.trim();

    if (!title) {
      return NextResponse.json({ error: 'Document title is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('documents').delete().eq('title', title);

    if (error) throw error;

    return NextResponse.json({ message: `Deleted indexed chunks for "${title}".` });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete document.' },
      { status: 500 }
    );
  }
}
