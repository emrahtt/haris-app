"use client";

/**
 * HARIS v2 — Petition Canvas
 *
 * Sprint 11.5'te markdown önizleme. Faz 13'te Tiptap editor + version history.
 */

import { useState } from "react";
import { TiptapEditor } from "./tiptap-editor";

interface PetitionCanvasProps {
  markdown?: string;
  version?: number;
  qualityScore?: number;
  isGenerating?: boolean;
  emptyHint?: string;
  workspaceId?: string;
}

export function PetitionCanvas({
  markdown,
  version,
  qualityScore,
  isGenerating,
  emptyHint,
  workspaceId,
}: PetitionCanvasProps) {
  const [editMode, setEditMode] = useState(false);

  if (!markdown && !isGenerating) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4 opacity-30">📄</div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            Canvas henüz boş
          </h3>
          <p className="text-sm text-slate-500">
            {emptyHint ??
              "Belge yükleyin ve Orkestra Şefi'ne süreci başlatmasını söyleyin. Dilekçe taslağı burada belirecek."}
          </p>
        </div>
      </div>
    );
  }

  if (isGenerating && !markdown) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#C9A961]/30 border-t-[#C9A961] rounded-full animate-spin mb-4"></div>
          <div className="text-sm text-slate-400">
            Dilekçe Editörü taslağı hazırlıyor…
          </div>
        </div>
      </div>
    );
  }

  const handleSaveVersion = async (newMarkdown: string) => {
    if (!workspaceId) return;
    try {
      await fetch(`/api/v2/workspaces/${workspaceId}/petition/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: newMarkdown }),
      });
    } catch (e) {
      console.error("Versiyon kaydetme hatası:", e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">
            Dilekçe Taslağı
          </div>
          <div className="text-sm text-slate-300">
            Versiyon {version ?? 1}
            {qualityScore !== undefined && (
              <span className="ml-3 text-[#C9A961]">
                Kalite: {qualityScore}/100
              </span>
            )}
            {editMode && (
              <span className="ml-3 text-emerald-300">✏️ Düzenleme modu</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-3 py-1.5 rounded text-xs border transition ${
              editMode
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 hover:bg-white/5"
            }`}
          >
            {editMode ? "👁 Önizle" : "✏️ Düzenle"}
          </button>
          <button
            onClick={() => {
              if (markdown) navigator.clipboard?.writeText(markdown);
            }}
            className="px-3 py-1.5 rounded text-xs border border-white/10 hover:bg-white/5"
            title="Markdown olarak panoya kopyala"
          >
            📋 Kopyala
          </button>
          <a
            href={workspaceId ? `/api/v2/workspaces/${workspaceId}/petition/download?format=md` : "#"}
            className="px-3 py-1.5 rounded text-xs border border-white/10 hover:bg-white/5"
          >
            📥 Markdown
          </a>
          <a
            href={workspaceId ? `/api/v2/workspaces/${workspaceId}/petition/download?format=txt` : "#"}
            className="px-3 py-1.5 rounded text-xs border border-white/10 hover:bg-white/5"
          >
            📥 Düz Metin
          </a>
          <a
            href={workspaceId ? `/api/v2/workspaces/${workspaceId}/petition/download?format=udf` : "#"}
            className="px-3 py-1.5 rounded text-xs border border-[#C9A961]/40 bg-[#C9A961]/5 hover:bg-[#C9A961]/15 text-[#C9A961]"
            title="UYAP'a yüklenebilir format (.udf) — Türk avukat günlük format"
          >
            📥 UDF (UYAP)
          </a>
          <a
            href={workspaceId ? `/api/v2/workspaces/${workspaceId}/petition/download?format=docx` : "#"}
            className="px-3 py-1.5 rounded text-xs border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/15 text-blue-200"
            title="Microsoft Word formatı"
          >
            📥 Word
          </a>
          <a
            href={workspaceId ? `/api/v2/workspaces/${workspaceId}/petition/download?format=pdf` : "#"}
            className="px-3 py-1.5 rounded text-xs border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-rose-200"
            title="PDF formatı"
          >
            📥 PDF
          </a>
        </div>
      </div>

      {/* Content */}
      {editMode ? (
        <TiptapEditor
          initialMarkdown={markdown ?? ""}
          onSave={handleSaveVersion}
        />
      ) : (
        <article className="prose prose-invert prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed">
            {markdown}
          </pre>
        </article>
      )}
    </div>
  );
}
