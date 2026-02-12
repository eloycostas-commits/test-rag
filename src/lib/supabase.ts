import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

type DocumentRow = {
  id: number;
  created_at: string;
  title: string;
  chunk_index: number;
  content: string;
  embedding: number[];
};

type Database = {
  public: {
    Tables: {
      documents: {
        Row: DocumentRow;
        Insert: {
          id?: never;
          created_at?: string;
          title: string;
          chunk_index: number;
          content: string;
          embedding: number[];
        };
        Update: Partial<{
          title: string;
          chunk_index: number;
          content: string;
          embedding: number[];
        }>;
      };
    };
    Functions: {
      match_documents: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
        };
        Returns: {
          id: number;
          title: string;
          chunk_index: number;
          content: string;
          similarity: number;
        }[];
      };
    };
  };
};

let supabaseAdminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdmin() {
  if (supabaseAdminClient) return supabaseAdminClient;

  const env = getEnv();
  supabaseAdminClient = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  return supabaseAdminClient;
}
