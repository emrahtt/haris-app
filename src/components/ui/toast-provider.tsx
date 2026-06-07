"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastFn = (message: string) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<string | null>(null);

  const show = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[var(--color-bg-2)] border border-[var(--color-gold-soft)] border-l-4 border-l-[var(--color-gold)] px-4 py-3.5 rounded-lg shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] z-[200] text-[13px] max-w-sm animate-slide-in">
          {toast}
        </div>
      )}
    </ToastContext.Provider>
  );
}
