"use client";

/**
 * HARIS v2 — Tiptap Rich Text Editor
 *
 * Markdown <-> HTML dönüşümü ile kullanıcının dilekçeyi düzenlemesine izin verir.
 * Sade toolbar (Bold, Italic, H1-3, Liste, Quote).
 *
 * NOT: Markdown'dan HTML'e çevirim basit regex tabanlı; karmaşık markdown için
 * remark/rehype pipeline'a geçebiliriz ama şu an performans + boyut için sade.
 */

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";

interface Props {
  initialMarkdown: string;
  onChange?: (html: string, markdown: string) => void;
  onSave?: (markdown: string) => Promise<void>;
  readOnly?: boolean;
}

export function TiptapEditor({
  initialMarkdown,
  onChange,
  onSave,
  readOnly = false,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: markdownToHtml(initialMarkdown),
    editable: !readOnly,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none min-h-[500px] focus:outline-none px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        const html = editor.getHTML();
        const md = htmlToMarkdown(html);
        onChange(html, md);
      }
    },
    immediatelyRender: false, // SSR uyumlu
  });

  useEffect(() => {
    if (editor && initialMarkdown) {
      editor.commands.setContent(markdownToHtml(initialMarkdown));
    }
  }, [editor, initialMarkdown]);

  if (!editor) return <div className="p-4 text-slate-500">Yükleniyor…</div>;

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      const md = htmlToMarkdown(editor.getHTML());
      await onSave(md);
      setSavedAt(new Date().toLocaleTimeString("tr-TR"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0E1B30]">
      {!readOnly && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/10 bg-white/[0.02] flex-wrap">
          <ToolButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            label="B"
            title="Kalın (Ctrl+B)"
            className="font-bold"
          />
          <ToolButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            label="I"
            title="İtalik (Ctrl+I)"
            className="italic"
          />
          <ToolButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            label="S"
            title="Üstü çizili"
            className="line-through"
          />
          <Sep />
          <ToolButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={editor.isActive("heading", { level: 1 })}
            label="H1"
            title="Başlık 1"
          />
          <ToolButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor.isActive("heading", { level: 2 })}
            label="H2"
            title="Başlık 2"
          />
          <ToolButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={editor.isActive("heading", { level: 3 })}
            label="H3"
            title="Başlık 3"
          />
          <Sep />
          <ToolButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            label="• Liste"
            title="Madde listesi"
          />
          <ToolButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            label="1. Liste"
            title="Numaralı liste"
          />
          <ToolButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            label="❝"
            title="Alıntı"
          />
          <Sep />
          <ToolButton
            onClick={() => editor.chain().focus().undo().run()}
            label="↶"
            title="Geri al (Ctrl+Z)"
            disabled={!editor.can().undo()}
          />
          <ToolButton
            onClick={() => editor.chain().focus().redo().run()}
            label="↷"
            title="Yinele (Ctrl+Y)"
            disabled={!editor.can().redo()}
          />
          {onSave && (
            <>
              <Sep />
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 rounded text-xs bg-[#C9A961] text-[#0A1628] font-semibold hover:bg-[#e6c479] disabled:opacity-50"
              >
                {saving ? "Kaydediliyor…" : "💾 Versiyon Kaydet"}
              </button>
              {savedAt && (
                <span className="text-[10px] text-emerald-300 ml-2">
                  ✓ {savedAt}
                </span>
              )}
            </>
          )}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolButton({
  onClick,
  active,
  label,
  title,
  className = "",
  disabled = false,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  title: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`px-2 py-1 rounded text-xs transition ${
        active
          ? "bg-[#C9A961] text-[#0A1628]"
          : "text-slate-300 hover:bg-white/5"
      } ${disabled ? "opacity-30 cursor-not-allowed" : ""} ${className}`}
    >
      {label}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 text-slate-700">|</span>;
}

// ─────────────────────────────────────────────────────────────
// Markdown <-> HTML basit dönüştürme
// ─────────────────────────────────────────────────────────────

function markdownToHtml(md: string): string {
  let html = md.replace(/<!--[\s\S]*?-->/g, ""); // yorum kaldır

  // Başlıklar (en uzun önce!)
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Bold + italic (önce kalın, sonra italic; çakışma olmaması için)
  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // Madde / numaralı liste (basit, multi-line blokları paragraflara böler)
  // Önce ardışık -/+ satırlarını <ul> içine al
  html = html.replace(
    /((?:^[-*+] .+\n?)+)/gm,
    (match) =>
      `<ul>${match
        .trim()
        .split(/\n/)
        .map((l) => `<li>${l.replace(/^[-*+]\s+/, "")}</li>`)
        .join("")}</ul>`
  );
  html = html.replace(
    /((?:^\d+\.\s+.+\n?)+)/gm,
    (match) =>
      `<ol>${match
        .trim()
        .split(/\n/)
        .map((l) => `<li>${l.replace(/^\d+\.\s+/, "")}</li>`)
        .join("")}</ol>`
  );

  // Blockquote
  html = html.replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>");

  // Paragraf (boş satırla ayrılmış olanlar)
  // Şimdi html'i blok blok ayır
  const blocks = html.split(/\n\s*\n/);
  return blocks
    .map((b) => {
      const t = b.trim();
      if (!t) return "";
      // Eğer zaten HTML tag ile başlıyorsa olduğu gibi
      if (/^<(h[1-6]|ul|ol|blockquote|table|pre)/i.test(t)) return t;
      return `<p>${t.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
}

function htmlToMarkdown(html: string): string {
  let md = html;
  // Başlıklar
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<h[456][^>]*>(.*?)<\/h[456]>/gi, "#### $1\n\n");

  // Bold + italic + strike + code
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, "~~$1~~");
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");

  // Lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) =>
    inner.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n") + "\n"
  );
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    let i = 1;
    return (
      inner.replace(
        /<li[^>]*>(.*?)<\/li>/gi,
        () => `${i++}. ${RegExp.$1}\n`
      ) + "\n"
    );
  });

  // Blockquote
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "> $1\n\n");

  // Paragraph + br
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");

  // Geri kalan tüm tag'leri çıkar
  md = md.replace(/<[^>]+>/g, "");

  // HTML entities
  md = md
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return md.replace(/\n{3,}/g, "\n\n").trim();
}
