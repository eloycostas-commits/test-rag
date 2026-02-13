import OpenAI from 'openai';
import { getEnv } from './env';

let client: OpenAI | null = null;

const REQUEST_TIMEOUT_MS = 25_000;
const RETRY_DELAYS_MS = [400, 1_000, 2_000] as const;

function getGroqClient(): OpenAI {
  if (client) return client;
  const env = getEnv();
  client = new OpenAI({
    apiKey: env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
    timeout: REQUEST_TIMEOUT_MS
  });
  return client;
}

function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashText(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('timeout') || message.includes('429') || message.includes('rate limit');
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function getEmbedding(input: string): Promise<number[]> {
  const normalized = normalizeText(input).toLowerCase();
  const dimensions = 1536;
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);

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
  const normalizedQuestion = normalizeText(question);

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const completion = await groq.chat.completions.create({
        model: env.GROQ_CHAT_MODEL,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content:
              'You are a technical assistant specialized in mechanical engineering, elevator systems, and regulations. Use only provided context. If context is insufficient, explicitly state the missing information and ask a precise follow-up question.'
          },
          {
            role: 'user',
            content: `Question: ${normalizedQuestion}\n\nRetrieved context:\n${context || 'No context found.'}\n\nProvide:\n1) Direct answer\n2) Key assumptions\n3) If uncertain, explain why.`
          }
        ]
      });

      return completion.choices[0]?.message?.content ?? 'No answer generated.';
    } catch (error) {
      if (!isRetryableError(error) || attempt === RETRY_DELAYS_MS.length) {
        if (error instanceof Error) {
          if (error.message.includes('401')) {
            throw new Error('Groq authentication failed. Check GROQ_API_KEY.');
          }
          if (error.message.includes('429')) {
            throw new Error('Groq rate limit exceeded. Please retry in a few seconds.');
          }
        }
        throw error;
      }

      await delay(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new Error('Failed to generate answer after retries.');
}
