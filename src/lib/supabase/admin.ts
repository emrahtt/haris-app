import { createClient } from "@supabase/supabase-js";
import { supabaseConfig, isDemoMode } from "./config";

/** Webhook / cüzdan — RLS yok, service role. */
export function createAdminClient() {
  if (isDemoMode || !supabaseConfig.serviceRoleKey || !supabaseConfig.url) {
    return null;
  }
  return createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
