/**
 * HARIS v2 — Matter Workspace Layout
 *
 * /v2/* altındaki tüm sayfaların ortak çerçevesi.
 * Eski /(app), /(legal), /admin route'ları etkilenmez.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HARIS v2 · Matter Workspace",
  description: "Davanın Yorulmaz Bekçisi — 12 uzman AI ajan orkestrası",
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A1628] text-slate-100">
      {/* Top bar — workspace bilgisi + global aksiyonlar */}
      <header className="border-b border-white/10 bg-[#0A1628]/95 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <Link href="/v2/workspaces/new" className="flex items-center gap-2">
              <span
                className="text-xl font-bold tracking-wide"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: "#C9A961",
                }}
              >
                HARIS
              </span>
              <span className="text-xs uppercase tracking-widest text-slate-400">
                v2 · Matter Workspace
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a
              href="/dashboard"
              className="text-slate-400 hover:text-slate-200 transition"
            >
              ← Eski Arayüz
            </a>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
