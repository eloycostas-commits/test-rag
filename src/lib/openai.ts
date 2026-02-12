import OpenAI from 'openai';
import { getEnv } from './env';

let client: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (client) return client;
  const env = getEnv();
  client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

export async function getEmbedding(input: string): Promise<number[]> {
  const env = getEnv();
  const openai = getOpenAIClient();

  const response = await openai.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input
  });

  return response.data[0].embedding;
}

export async function createChatCompletion(question: string, context: string): Promise<string> {
  const env = getEnv();
  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_CHAT_MODEL,
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
