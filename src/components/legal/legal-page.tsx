"use client";

import { type ReactNode } from "react";

interface Props {
  title: string;
  version: string;
  lastUpdated: string;
  children: ReactNode;
}

/**
 * Hukuki belgeler için standart layout.
 * Tüm metinler markdown-benzeri yapıda, kullanıcı dostu tipografi.
 */
export function LegalPage({ title, version, lastUpdated, children }: Props) {
  return (
    <article className="legal-prose">
      <div className="mb-8 pb-6 border-b border-[var(--color-line)]">
        <h1 className="font-serif text-4xl text-[var(--color-text)] mb-3">{title}</h1>
        <div className="flex gap-4 text-[12px] text-[var(--color-text-3)]">
          <span>
            Versiyon: <code className="bg-[var(--color-bg-2)] px-1.5 py-0.5 rounded text-[var(--color-gold-bright)]">{version}</code>
          </span>
          <span>Son güncelleme: {lastUpdated}</span>
        </div>
      </div>
      <div className="text-[var(--color-text-2)] leading-7 text-[14px] space-y-4">
        {children}
      </div>

      <style jsx global>{`
        .legal-prose h2 {
          font-family: "Playfair Display", serif;
          font-size: 22px;
          color: var(--color-gold-bright);
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--color-line);
        }
        .legal-prose h3 {
          font-size: 16px;
          color: var(--color-text);
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        .legal-prose p {
          margin-bottom: 0.75rem;
        }
        .legal-prose ul,
        .legal-prose ol {
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .legal-prose ul {
          list-style-type: disc;
        }
        .legal-prose ol {
          list-style-type: decimal;
        }
        .legal-prose li {
          margin-bottom: 0.5rem;
        }
        .legal-prose strong {
          color: var(--color-text);
        }
        .legal-prose a {
          color: var(--color-gold-bright);
          text-decoration: underline;
        }
        .legal-prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          font-size: 13px;
        }
        .legal-prose th,
        .legal-prose td {
          padding: 8px 12px;
          border: 1px solid var(--color-line);
          text-align: left;
        }
        .legal-prose th {
          background: var(--color-bg-2);
          color: var(--color-gold-bright);
          font-weight: 600;
        }
        .legal-prose .callout {
          background: var(--color-info)/10;
          border-left: 3px solid var(--color-info);
          padding: 12px 16px;
          margin: 1rem 0;
          border-radius: 6px;
        }
      `}</style>
    </article>
  );
}
