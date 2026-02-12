import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env';

type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          id: number;
          created_at: string;
          title: string;
          chunk_index: number;
          content: string;
          embedding: number[];
        };
        Insert: {
          id?: never;
          created_at?: string;
          title: string;
          chunk_index: number;
          content: string;
          embedding: number[];
        };
        Update: {
          title?: string;
          chunk_index?: number;
          content?: string;
          embedding?: number[];
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
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
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let supabaseAdminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (supabaseAdminClient) return supabaseAdminClient;

  const env = getEnv();
  supabaseAdminClient = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  return supabaseAdminClient;
}
