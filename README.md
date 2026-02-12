# Mechanical Engineering PDF RAG Prototype (Next.js + Supabase + OpenAI)

This project gives you a **TypeScript + React** prototype you can deploy on **Vercel** with **Supabase (free tier)**.

## What it does

- Upload a PDF (technical manuals, regulations, elevator docs).
- Parse and chunk text.
- Create embeddings with OpenAI.
- Store chunks + vectors in Supabase `pgvector`.
- Chat endpoint retrieves relevant chunks and asks GPT to answer from context.

## Architecture (free-tier friendly)

- **Frontend + API**: Next.js App Router on Vercel.
- **Database + vector search**: Supabase Postgres + `vector` extension.
- **LLM/embeddings**: OpenAI API (swap models via env vars).

## Local setup

1. Install deps:

```bash
npm install
```

2. Add env vars:

```bash
cp .env.example .env.local
```

3. In Supabase SQL editor, run:

```sql
-- from supabase/schema.sql
```

4. Start app:

```bash
npm run dev
```

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import project in Vercel.
3. Add the same env vars from `.env.local` in Vercel settings.
4. Ensure Supabase project allows Vercel outbound calls.

## LangExtract analysis

Google's [LangExtract](https://github.com/google/langextract) is promising for structured extraction from long documents, but for your immediate RAG prototype it is **not the first tool I would use in production**:

- It is focused on extraction workflows (entities, relations, schema-guided outputs), not turnkey vector retrieval.
- It is Python-first, so integrating into a fully TypeScript Next.js stack adds operational complexity.
- For current goals (upload PDFs + Q/A retrieval), direct chunking + embeddings + pgvector is simpler and cheaper to maintain.

### Where LangExtract could help later

- Build high-quality metadata from engineering PDFs (e.g., regulation numbers, component names, part standards, maintenance intervals).
- Generate structured fields that you index alongside vectors to improve filtering (`country`, `regulation_type`, `equipment_type`, `safety_class`).
- Power hybrid retrieval: semantic similarity + metadata filters.

## Suggested next features

- Authentication (Supabase Auth) and per-user private document spaces.
- Citation mode (return chunk ids/pages in each answer).
- OCR pipeline for scanned PDFs.
- Ingestion queue/background jobs for larger files.
- Guardrails for legal-regulation answers (version/date checks).

## Key files

- `src/app/api/upload/route.ts` – PDF ingest and vectorization.
- `src/app/api/chat/route.ts` – Retrieval + GPT answer.
- `supabase/schema.sql` – pgvector table and similarity RPC.

## Vercel build troubleshooting

If Vercel fails during `npm run build` with a non-obvious internal stack trace, the most common cause is missing environment variables.

Make sure all of these are configured in **Project Settings → Environment Variables** for the target environment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL` (optional, defaults to `gpt-4o-mini`)
- `OPENAI_EMBEDDING_MODEL` (optional, defaults to `text-embedding-3-small`)

The server now validates these lazily and returns explicit errors at runtime instead of failing import-time during build.

## Upload error on Vercel: `Unexpected token "R" ... is not valid JSON`

This usually means your upload request did **not** return JSON (often a Vercel platform error page/text such as `Request Entity Too Large`).

What to do:

- Keep PDF uploads small (for this prototype, stay under ~4MB).
- If you need larger files, switch to direct-to-storage upload (e.g., Supabase Storage signed upload URL) and process in a background job.

The uploader now handles non-JSON error responses gracefully and shows a human-readable error instead of crashing on `response.json()`.
