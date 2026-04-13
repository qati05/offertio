import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Module-level singleton — one client per browser session.
// Prevents duplicate GoTrue instances and token-refresh race conditions
// when multiple components call createSupabaseBrowser() concurrently.
let _client: SupabaseClient | null = null;

export function createSupabaseBrowser(): SupabaseClient {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
