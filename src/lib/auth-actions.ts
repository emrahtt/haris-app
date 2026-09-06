"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";

/**
 * Giriş yap (Server Action — form action olarak kullanılır).
 * Demo modda her email/password kabul edilir.
 *
 * Not: Server Action form action olarak kullanıldığı için void döner.
 * Hata durumunda redirect ile error sayfasına yönlendiriyoruz.
 */
export async function signIn(formData: FormData): Promise<void> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (isDemoMode) {
    const cookieStore = await cookies();
    cookieStore.set("haris-demo-session", "active", {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    redirect("/dashboard");
  }

  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase yapılandırılmamış");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData): Promise<void> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (isDemoMode) {
    const cookieStore = await cookies();
    cookieStore.set("haris-demo-session", "active", {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    redirect("/dashboard");
  }

  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase yapılandırılmamış");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  // Supabase email confirmation açıksa kullanıcı henüz session almamıştır
  // (data.session === null). Bu durumda login'e yönlendir + bilgi mesajı göster.
  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent(
        "Hesabınız oluşturuldu! 📧 E-postanıza onay linki gönderildi. Onayladıktan sonra giriş yapabilirsiniz."
      )}`
    );
  }

  // Session var → direkt dashboard
  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  if (isDemoMode) {
    const cookieStore = await cookies();
    cookieStore.delete("haris-demo-session");
    redirect("/login");
  }

  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();

  redirect("/login");
}
