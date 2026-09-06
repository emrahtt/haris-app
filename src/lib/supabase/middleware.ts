import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig, isDemoMode } from "./config";

/**
 * Middleware için Supabase session yenileme.
 * - /dashboard, /cases, vb. → auth gerektirir
 * - /admin → auth + (server-side `requireAdmin()` ile) admin yetkisi gerektirir
 *
 * Demo modda demo cookie tabanlı basit auth.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;

  // Büyük harf /V2 → /v2 (telefon/Outlook otomatik büyük harf yapabiliyor)
  if (pathname === "/V2" || pathname.startsWith("/V2/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/v2" + pathname.slice(3);
    return NextResponse.redirect(url);
  }
  // Faz 13.5.5: /v2 Matter Workspace de artık auth zorunlu (matter isolation için)
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/cases") ||
    pathname.startsWith("/agents") ||
    pathname.startsWith("/library") ||
    pathname.startsWith("/research") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/v2");

  if (isDemoMode) {
    const demoCookie = request.cookies.get("haris-demo-session");
    const isLoggedIn = demoCookie?.value === "active";

    if (isProtected && !isLoggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // /admin için ek katman: server-side requireAdmin() route içinde de kontrol eder,
  // ama burada erken redirect ile UX iyileştirme
  if (user && pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("error", "admin-required");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
