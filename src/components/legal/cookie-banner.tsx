"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { LEGAL_DOCUMENT_VERSIONS } from "@/lib/kvkk/constants";

const STORAGE_KEY = "haris-cookie-consent";
const STORAGE_VERSION = "v1";

interface CookiePrefs {
  essential: boolean; // Her zaman true
  analytics: boolean;
  marketing: boolean;
  version: string;
  acceptedAt: string;
}

function loadPrefs(): CookiePrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookiePrefs;
    // Versiyon değiştiyse yeniden onay al
    if (parsed.version !== STORAGE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePrefs(p: Omit<CookiePrefs, "version" | "acceptedAt">) {
  const full: CookiePrefs = {
    ...p,
    essential: true,
    version: STORAGE_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(full));

  // Backend'e gönder (logged-in kullanıcılar için kayıt)
  fetch("/api/account/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consentType: "cookie_essential",
      granted: true,
      documentVersion: LEGAL_DOCUMENT_VERSIONS.cookie_policy,
    }),
  }).catch(() => null);

  if (p.analytics) {
    fetch("/api/account/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consentType: "cookie_analytics",
        granted: true,
        documentVersion: LEGAL_DOCUMENT_VERSIONS.cookie_policy,
      }),
    }).catch(() => null);
  }
}

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // Mount sonrası kontrol — SSR/hydration safe
    const existing = loadPrefs();
    if (!existing) {
      // Kısa gecikme — sayfa yüklenince ani açılmasın
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function acceptAll() {
    savePrefs({ essential: true, analytics: true, marketing: true });
    setShow(false);
  }

  function acceptEssentialOnly() {
    savePrefs({ essential: true, analytics: false, marketing: false });
    setShow(false);
  }

  function saveCustom() {
    savePrefs({ essential: true, analytics, marketing });
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-[var(--color-bg-1)] border border-[var(--color-gold-soft)] rounded-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] p-5 md:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold-bright)] flex items-center justify-center flex-shrink-0">
            <Cookie size={18} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[15px] mb-1.5">
              Çerezleri Kullanıyoruz 🍪
            </h3>
            <p className="text-[12.5px] text-[var(--color-text-2)] leading-relaxed">
              HARIS, hizmet kalitesini artırmak için çerezler kullanır. <strong>Zorunlu
              çerezler</strong> (oturum, güvenlik) her zaman aktiftir. Analitik ve pazarlama
              çerezleri için tercihinizi seçebilirsiniz.{" "}
              <Link
                href="/legal/cookies"
                className="text-[var(--color-gold-bright)] underline"
              >
                Detaylı bilgi
              </Link>
            </p>
          </div>
          <button
            onClick={acceptEssentialOnly}
            className="text-[var(--color-text-3)] hover:text-[var(--color-text)] p-1"
            title="Sadece zorunlu çerezleri kabul et ve kapat"
          >
            <X size={16} />
          </button>
        </div>

        {showDetails && (
          <div className="space-y-2 mb-4 text-[12.5px] border-t border-[var(--color-line)] pt-4">
            <label className="flex items-center gap-3 p-2 hover:bg-[var(--color-bg-2)] rounded cursor-not-allowed opacity-70">
              <input type="checkbox" checked disabled />
              <div className="flex-1">
                <div className="font-medium">Zorunlu Çerezler</div>
                <div className="text-[11px] text-[var(--color-text-3)]">
                  Oturum, güvenlik, çerez tercihiniz. Devre dışı bırakılamaz.
                </div>
              </div>
              <span className="text-[10px] bg-[var(--color-ok)]/15 text-[var(--color-ok)] px-2 py-0.5 rounded">
                Aktif
              </span>
            </label>

            <label className="flex items-center gap-3 p-2 hover:bg-[var(--color-bg-2)] rounded cursor-pointer">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              <div className="flex-1">
                <div className="font-medium">Analitik Çerezler</div>
                <div className="text-[11px] text-[var(--color-text-3)]">
                  Hizmetin nasıl kullanıldığını anonim olarak ölçer (sayfa sayımı,
                  hata oranı). Vercel Analytics.
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-2 hover:bg-[var(--color-bg-2)] rounded cursor-pointer">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
              <div className="flex-1">
                <div className="font-medium">Pazarlama Çerezleri</div>
                <div className="text-[11px] text-[var(--color-text-3)]">
                  Şu an kullanılmıyor. İleride aktive edilirse opsiyoneldir.
                </div>
              </div>
            </label>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          {!showDetails ? (
            <>
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-[12.5px] text-[var(--color-text-2)] hover:text-[var(--color-text)]"
              >
                Tercihleri özelleştir
              </button>
              <button
                onClick={acceptEssentialOnly}
                className="px-4 py-2 text-[12.5px] border border-[var(--color-line-2)] rounded-lg hover:border-[var(--color-gold-soft)]"
              >
                Sadece Zorunlu
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-2 text-[12.5px] font-semibold bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-soft)] text-[var(--color-bg-deep)] rounded-lg hover:opacity-90"
              >
                Tümünü Kabul Et
              </button>
            </>
          ) : (
            <button
              onClick={saveCustom}
              className="px-4 py-2 text-[12.5px] font-semibold bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-soft)] text-[var(--color-bg-deep)] rounded-lg hover:opacity-90"
            >
              Tercihleri Kaydet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
