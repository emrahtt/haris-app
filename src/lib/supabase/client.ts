"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig, isDemoMode } from "./config";

/**
 * Tarayıcı tarafı Supabase istemcisi.
 * Demo modda null döner; çağıran kod demo fallback'e geçer.
 */
export function createClient() {
  if (isDemoMode) return null;

  return createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey);
}
