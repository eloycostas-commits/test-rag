import OpenAI from 'openai';
import { getEnv } from './env';

let client: OpenAI | null = null;

function getGroqClient(): OpenAI {
  if (client) return client;
  const env = getEnv();
  client = new OpenAI({
    apiKey: env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
  });
  return client;
}

function hashText(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export async function getEmbedding(input: string): Promise<number[]> {
  const dimensions = 1536;
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = input.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

  for (const token of tokens) {
    const slot = hashText(token) % dimensions;
    vector[slot] += 1;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}

export async function createChatCompletion(question: string, context: string): Promise<string> {
  const env = getEnv();
  const groq = getGroqClient();

  const completion = await groq.chat.completions.create({
    model: env.GROQ_CHAT_MODEL,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content:
          'You are a technical assistant for mechanical engineering and elevator regulations. Use only retrieved context. If missing information, say so.'
      },
      {
        role: 'user',
        content: `Question: ${question}\n\nContext:\n${context || 'No context found.'}`
      }
    ]
  });

  return completion.choices[0]?.message?.content ?? 'No answer generated.';
}
