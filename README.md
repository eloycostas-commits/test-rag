# Mechanical Engineering PDF RAG Prototype (Next.js + Supabase + Groq)

This project gives you a **TypeScript + React** prototype you can deploy on **Vercel** with **Supabase (free tier)**.

## What it does

- Upload a PDF (technical manuals, regulations, elevator docs).
- Parse and chunk text.
- Create deterministic local embeddings (no paid embedding API required).
- Store chunks + vectors in Supabase `pgvector`.
- Chat endpoint retrieves relevant chunks and asks GPT to answer from context.

## Architecture (free-tier friendly)

- **Frontend + API**: Next.js App Router on Vercel.
- **Database + vector search**: Supabase Postgres + `vector` extension.
- **LLM**: Groq API (OpenAI-compatible endpoint).
- **Embeddings**: lightweight local hashing embeddings (prototype-friendly, zero API cost).

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
- `GROQ_API_KEY`
- `GROQ_CHAT_MODEL` (optional, defaults to `llama-3.1-8b-instant`)

The server now validates these lazily and returns explicit errors at runtime instead of failing import-time during build.

## Upload error on Vercel: `Unexpected token "R" ... is not valid JSON`

This usually means your upload request did **not** return JSON (often a Vercel platform error page/text such as `Request Entity Too Large`).

What to do:

- Keep PDF uploads small (for this prototype, stay under ~4MB).
- If you need larger files, switch to direct-to-storage upload (e.g., Supabase Storage signed upload URL) and process in a background job.

The uploader now handles non-JSON error responses gracefully and shows a human-readable error instead of crashing on `response.json()`.

## Required Vercel environment variables (important)

If you see:

`Invalid server environment variables. Please configure: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY`

it means the deployment has missing secrets.

In Vercel:

1. Open **Project Settings → Environment Variables**.
2. Add these variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY`
   - `GROQ_CHAT_MODEL` *(optional)*
3. Ensure they are enabled for **Production**, **Preview**, and **Development** (as needed).
4. Trigger a **Redeploy** after saving variables (existing deploys do not auto-pick up newly added env vars).

Tip: use `.env.example` as the source of truth when copying values to Vercel.
