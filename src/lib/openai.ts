import OpenAI from 'openai';
import { env } from './env';

export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function getEmbedding(input: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input
  });

  return response.data[0].embedding;
}
