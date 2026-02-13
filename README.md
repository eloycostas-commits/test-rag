# Mechanical Engineering PDF RAG Prototype (Next.js + Supabase + Groq)

This project gives you a **TypeScript + React** prototype you can deploy on **Vercel** with **Supabase (free tier)**.

## What it does

- Upload a PDF (technical manuals, regulations, elevator docs) directly to Supabase Storage.
- Trigger server-side parse/chunk/index from the stored file, then delete the temporary object.
- Delete previously indexed PDF data by title from the UI (when you uploaded a wrong file).
- Create deterministic local embeddings (no paid embedding API required).
- Store chunks + vectors in Supabase `pgvector`.
- Chat endpoint retrieves relevant chunks and asks GPT to answer from context.

## Architecture (free-tier friendly)

- **Frontend + API**: Next.js App Router on Vercel (metadata + processing calls).
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
- `src/app/api/documents/route.ts` – List/delete indexed documents by title.
- `supabase/schema.sql` – pgvector table and similarity RPC.

## Vercel build troubleshooting

If Vercel fails during `npm run build` with a non-obvious internal stack trace, the most common cause is missing environment variables.

Make sure all of these are configured in **Project Settings → Environment Variables** for the target environment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_UPLOAD_BUCKET` (optional, defaults to `uploads-temp`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET` (optional, defaults to `uploads-temp`)
- `NEXT_PUBLIC_MAX_UPLOAD_MB` (optional, defaults to `100`)
- `GROQ_API_KEY`
- `GROQ_CHAT_MODEL` (optional, defaults to `llama-3.1-8b-instant`)

The server now validates these lazily and returns explicit errors at runtime instead of failing import-time during build.

## Upload error on Vercel: `Unexpected token "R" ... is not valid JSON`

This usually means your upload request did **not** return JSON (often a Vercel platform error page/text such as `Request Entity Too Large`).

What to do:

- Vercel Function request payload limits apply; large file POSTs (like 300MB) will fail with `FUNCTION_PAYLOAD_TOO_LARGE`.
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


## Important limitation: 300MB uploads on Vercel

If you upload through `/api/upload` on Vercel, large files can fail with:

`Request Entity Too Large / FUNCTION_PAYLOAD_TOO_LARGE`

You can set app-level limits to 100MB (`NEXT_PUBLIC_MAX_UPLOAD_MB=100`, `bodySizeLimit: "100mb"`), but Vercel may still enforce stricter Function payload limits depending on runtime/plan.

Current implemented flow for larger files:

1. Browser uploads PDF directly to Supabase Storage bucket (`uploads-temp` by default).
2. App calls `/api/upload` with `{ fileName, storagePath }` to parse/chunk/index.
3. API deletes the temporary storage object after processing (best-effort cleanup on errors too).


## Setting upload limit to 100MB

To configure a 100MB limit in this app:

1. Set `NEXT_PUBLIC_MAX_UPLOAD_MB=100` in your environment (or keep the default).
2. Keep `next.config.mjs` with `serverActions.bodySizeLimit = "100mb"`.

Important: On Vercel, platform request-body limits may still block large uploads before your route runs. For reliable large-file ingestion, use direct browser upload to Supabase Storage + background processing.


## Direct-to-storage upload flow

This project now avoids sending full file bodies through the Next.js upload route.

- Client uploads PDF to Supabase Storage using `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Client sends only JSON metadata (`fileName`, `storagePath`) to `/api/upload`.
- Server downloads from storage with service role, indexes chunks, and removes the temp file.

Create the storage bucket (default: `uploads-temp`) in Supabase before using uploads.
