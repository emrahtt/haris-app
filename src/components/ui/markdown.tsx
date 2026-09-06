"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/cn";

interface MarkdownProps {
  content: string;
  className?: string;
}

/**
 * HARIS markdown renderer.
 * Hukuki dilekçeler ve AI çıktıları için optimize edilmiş.
 * Citation, blockquote, table desteği vardır.
 */
export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn("haris-md", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-serif text-[var(--color-gold-bright)] mt-5 mb-3 pb-1.5 border-b border-[var(--color-line)]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-serif text-[var(--color-gold-bright)] mt-4 mb-2.5 font-semibold uppercase tracking-wide">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[15px] font-serif text-[var(--color-text)] mt-3.5 mb-2 font-semibold">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[13.5px] font-sans text-[var(--color-gold-bright)] mt-3 mb-1.5 font-semibold">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-[13.5px] text-[var(--color-text-2)] leading-7 mb-3">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="text-[var(--color-text)] font-semibold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-[var(--color-gold-bright)] italic">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-none pl-4 mb-3 space-y-1.5 text-[var(--color-text-2)] text-[13px]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-3 space-y-1.5 text-[var(--color-text-2)] text-[13px]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1 relative before:content-['▸'] before:absolute before:-left-3 before:text-[var(--color-gold)]">
              <span className="ml-1">{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-[3px] border-[var(--color-gold)] pl-4 py-2 my-3 bg-[var(--color-bg-2)] rounded-r-md text-[13px] italic text-[var(--color-text-2)]">
              {children}
            </blockquote>
          ),
          code: ({ children, ...props }) => {
            const isInline = !("data-language" in (props as Record<string, unknown>));
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold-bright)] text-[12px] font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block p-3 rounded-md bg-[var(--color-bg-deep)] text-[var(--color-text)] text-[12px] font-mono overflow-x-auto">
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-[var(--color-line)]">
              <table className="w-full text-[12.5px] border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[var(--color-bg-2)]">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-[var(--color-gold-bright)] font-semibold text-[11px] uppercase tracking-wider border-b border-[var(--color-line)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-[var(--color-line)] text-[var(--color-text-2)]">
              {children}
            </td>
          ),
          hr: () => <hr className="my-4 border-[var(--color-line)]" />,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-gold-bright)] underline hover:text-[var(--color-gold)]"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
