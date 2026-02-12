import { z } from 'zod';

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_UPLOAD_BUCKET: z.string().default('uploads-temp'),
  GROQ_API_KEY: z.string().min(1),
  GROQ_CHAT_MODEL: z.string().default('llama-3.1-8b-instant')
});

export type AppEnv = z.infer<typeof EnvSchema>;

let parsedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (parsedEnv) return parsedEnv;

  const result = EnvSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_UPLOAD_BUCKET: process.env.SUPABASE_UPLOAD_BUCKET,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_CHAT_MODEL: process.env.GROQ_CHAT_MODEL
  });

  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(
      `Invalid server environment variables. Please configure: ${missing}. ` +
        'For Vercel: Project Settings → Environment Variables, add values for Production/Preview/Development, then redeploy.'
    );
  }

  parsedEnv = result.data;
  return parsedEnv;
}
