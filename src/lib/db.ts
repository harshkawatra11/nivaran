import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let _db: SupabaseClient | null = null;

/** Server-only Supabase client using the service role key (bypasses RLS). Never import this
 *  from a client component. */
export function db(): SupabaseClient {
  if (!_db) {
    _db = createClient(env.supabaseUrl(), env.supabaseKey(), { auth: { persistSession: false } });
  }
  return _db;
}
