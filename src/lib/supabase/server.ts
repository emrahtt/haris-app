import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig, isDemoMode } from "./config";

/**
 * Sunucu tarafı Supabase istemcisi (Server Components, Route Handlers).
 * Demo modda null döner.
 */
export async function createClient() {
  if (isDemoMode) return null;

  const cookieStore = await cookies();

  return createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component içinden çağrılırsa sessizce geç
        }
      },
    },
  });
}
