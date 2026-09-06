"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "./file-dropzone";
import { DigestPanel } from "./digest-panel";
import { useToast } from "@/components/ui/toast-provider";
import {
  formatFileSize,
  LEGAL_DOC_TYPE_LABELS,
  type UploadedDoc,
} from "@/lib/ingest/types";
import type { CaseDigest } from "@/lib/ingest/digest";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Music,
  Eye,
  Trash2,
  Loader2,
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Props {
  caseId: string;
}

const ICON_BY_CATEGORY = {
  pdf: { Icon: FileText, color: "text-[var(--color-danger)] bg-[var(--color-danger)]/10" },
  word: { Icon: FileSpreadsheet, color: "text-[var(--color-info)] bg-[var(--color-info)]/10" },
  image: { Icon: ImageIcon, color: "text-[var(--color-ok)] bg-[var(--color-ok)]/10" },
  audio: { Icon: Music, color: "text-[var(--color-gold-bright)] bg-[var(--color-gold)]/10" },
  text: { Icon: FileText, color: "text-[var(--color-text-2)] bg-[var(--color-bg-3)]" },
  spreadsheet: { Icon: FileSpreadsheet, color: "text-[var(--color-ok)] bg-[var(--color-ok)]/10" },
  archive: { Icon: FileText, color: "text-[var(--color-warn)] bg-[var(--color-warn)]/10" },
  unknown: { Icon: FileText, color: "text-[var(--color-text-3)] bg-[var(--color-bg-3)]" },
};

export function DocumentsView({ caseId }: Props) {
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [digest, setDigest] = useState<CaseDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<UploadedDoc | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const toast = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/documents/list?caseId=${encodeURIComponent(caseId)}&digest=true`
      );
      const data = await res.json();
      setDocs(data.docs || []);
      setDigest(data.digest || null);
    } catch (err) {
      toast(`Yükleme hatası: ${err instanceof Error ? err.message : "x"}`);
    } finally {
      setLoading(false);
    }
  }, [caseId, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDelete(docId: string) {
    if (!confirm("Bu belgeyi silmek istediğinize emin misiniz?")) return;
    try {
      // Demo: sadece state'ten kaldır (gerçek endpoint Faz 6'da)
      setDocs((d) => d.filter((x) => x.id !== docId));
      toast("Belge listeden kaldırıldı");
    } catch {
      toast("Silme başarısız");
    }
  }

  return (
    <div className="space-y-4">
      {/* Üst panel: Yükle butonu + digest özeti */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[var(--color-text)] font-medium flex items-center gap-2">
            <FileText size={16} className="text-[var(--color-gold-bright)]" />
            Dava Belgeleri
            <span className="text-[12px] font-normal text-[var(--color-text-3)]">
              ({docs.length})
            </span>
          </h2>
          {digest && digest.readyDocs > 0 && (
            <div className="text-[11.5px] text-[var(--color-text-3)] mt-0.5">
              {digest.readyDocs} işlenmiş • {digest.criticalDocs} kritik •{" "}
              {(digest.totalChars / 1000).toFixed(1)}K karakter (~
              {digest.estimatedTokens.toLocaleString("tr-TR")} token)
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={refresh} disabled={loading} size="sm">
            <RotateCcw size={14} className={loading ? "animate-spin" : ""} /> Yenile
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowUpload((s) => !s)}
            size="sm"
          >
            <Sparkles size={14} /> {showUpload ? "Kapat" : "Belge Yükle"}
          </Button>
        </div>
      </div>

      {/* Upload zone (toggle) */}
      {showUpload && (
        <Card>
          <FileDropzone
            caseId={caseId}
            onUploadComplete={() => {
              refresh();
            }}
          />
        </Card>
      )}

      {/* İçerik ızgarası */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        {/* Sol: belge listesi */}
        <div>
          {loading && docs.length === 0 && (
            <Card className="text-center py-12 text-[var(--color-text-3)]">
              <Loader2 size={24} className="mx-auto mb-2 animate-spin" />
              Yükleniyor...
            </Card>
          )}

          {!loading && docs.length === 0 && (
            <Card className="text-center py-12 text-[var(--color-text-3)]">
              <FileText size={32} className="mx-auto mb-3 opacity-30" />
              <h3 className="text-[var(--color-text-2)] font-medium mb-1.5">
                Henüz belge yüklenmemiş
              </h3>
              <p className="text-[12.5px] max-w-md mx-auto">
                Dava dosyasındaki tüm belgeleri (dilekçeler, tutanaklar, sözleşmeler,
                bilirkişi raporları...) yükleyin. AI hepsini otomatik olarak inceleyip
                sınıflandıracak.
              </p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => setShowUpload(true)}
              >
                <Sparkles size={14} /> İlk Belgeyi Yükle
              </Button>
            </Card>
          )}

          {docs.length > 0 && (
            <div className="space-y-2">
              {docs.map((d) => (
                <DocCard
                  key={d.id}
                  doc={d}
                  selected={selectedDoc?.id === d.id}
                  onSelect={() => setSelectedDoc(d.id === selectedDoc?.id ? null : d)}
                  onDelete={() => handleDelete(d.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sağ: digest paneli */}
        <div className="space-y-3.5">
          {digest && digest.readyDocs > 0 && <DigestPanel digest={digest} />}
          {selectedDoc && <DocDetailPanel doc={selectedDoc} />}
        </div>
      </div>
    </div>
  );
}

function DocCard({
  doc,
  selected,
  onSelect,
  onDelete,
}: {
  doc: UploadedDoc;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const cfg = ICON_BY_CATEGORY[doc.mimeCategory] || ICON_BY_CATEGORY.unknown;
  const Icon = cfg.Icon;
  const cls = doc.classification;

  return (
    <div
      className={`grid grid-cols-[40px_1fr_auto] gap-3 items-center p-3 rounded-lg border transition-colors cursor-pointer ${
        selected
          ? "border-[var(--color-gold)] bg-[var(--color-gold)]/[0.06]"
          : "border-[var(--color-line)] bg-[var(--color-bg-1)] hover:border-[var(--color-gold-soft)]"
      }`}
      onClick={onSelect}
    >
      <div className={`w-10 h-12 rounded flex items-center justify-center ${cfg.color}`}>
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[13.5px] font-medium truncate">{doc.fileName}</span>
          {cls?.isCritical && (
            <span className="text-[10px] text-[var(--color-danger)] font-medium">
              ★ KRİTİK
            </span>
          )}
          {doc.status !== "ready" && doc.status !== "failed" && (
            <span className="text-[10px] text-[var(--color-info)] flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" />
              {doc.status === "extracting" ? "metin çıkarılıyor" : "AI sınıflandırıyor"}
            </span>
          )}
          {doc.status === "failed" && (
            <span className="text-[10px] text-[var(--color-danger)]">
              {doc.errorMessage || "başarısız"}
            </span>
          )}
        </div>
        <div className="text-[11px] text-[var(--color-text-3)] flex items-center gap-2 flex-wrap">
          <span>{formatFileSize(doc.sizeBytes)}</span>
          {doc.textLength > 0 && (
            <>
              <span>•</span>
              <span>{doc.textLength.toLocaleString("tr-TR")} karakter</span>
            </>
          )}
          {cls && (
            <>
              <span>•</span>
              <span className="bg-[var(--color-bg-3)] px-1.5 py-0.5 rounded">
                {LEGAL_DOC_TYPE_LABELS[cls.docType]}
              </span>
            </>
          )}
        </div>
        {cls?.summary && (
          <div className="text-[11.5px] text-[var(--color-text-2)] mt-1 line-clamp-2">
            {cls.summary}
          </div>
        )}
      </div>

      <div className="flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="w-7 h-7 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-2)] flex items-center justify-center hover:text-[var(--color-gold-bright)]"
        >
          <Eye size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-7 h-7 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-2)] flex items-center justify-center hover:text-[var(--color-danger)]"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function DocDetailPanel({ doc }: { doc: UploadedDoc }) {
  const [showFullText, setShowFullText] = useState(false);
  const cls = doc.classification;

  return (
    <Card>
      <h4 className="font-serif text-[var(--color-gold-bright)] text-[15px] mb-3">
        Belge Detayı
      </h4>
      <div className="text-[12.5px] space-y-2">
        <div>
          <div className="text-[10.5px] text-[var(--color-text-3)] uppercase tracking-wider">
            Dosya
          </div>
          <div className="font-medium break-all">{doc.fileName}</div>
        </div>

        {cls && (
          <>
            <div>
              <div className="text-[10.5px] text-[var(--color-text-3)] uppercase tracking-wider">
                AI Özeti
              </div>
              <div className="text-[var(--color-text-2)]">{cls.summary}</div>
            </div>

            {cls.dates.length > 0 && (
              <div>
                <div className="text-[10.5px] text-[var(--color-text-3)] uppercase tracking-wider">
                  Tespit Edilen Tarihler ({cls.dates.length})
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cls.dates.map((d) => (
                    <span
                      key={d}
                      className="text-[10.5px] bg-[var(--color-bg-2)] px-1.5 py-0.5 rounded font-mono"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {cls.parties.length > 0 && (
              <div>
                <div className="text-[10.5px] text-[var(--color-text-3)] uppercase tracking-wider">
                  Tespit Edilen Taraflar ({cls.parties.length})
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cls.parties.map((p) => (
                    <span
                      key={p}
                      className="text-[10.5px] bg-[var(--color-gold)]/10 text-[var(--color-gold-bright)] px-1.5 py-0.5 rounded"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {cls.keywords.length > 0 && (
              <div>
                <div className="text-[10.5px] text-[var(--color-text-3)] uppercase tracking-wider">
                  Anahtar Kelimeler
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cls.keywords.map((k) => (
                    <span
                      key={k}
                      className="text-[10.5px] bg-[var(--color-bg-3)] text-[var(--color-text-2)] px-1.5 py-0.5 rounded"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {doc.text && (
          <div>
            <button
              onClick={() => setShowFullText((s) => !s)}
              className="text-[11px] text-[var(--color-gold-bright)] flex items-center gap-1 hover:underline mt-2"
            >
              {showFullText ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
              Çıkarılan metin ({doc.textLength.toLocaleString("tr-TR")} karakter)
            </button>
            {showFullText && (
              <pre className="mt-2 p-2.5 bg-[var(--color-bg-deep)] rounded-md text-[11px] text-[var(--color-text-2)] whitespace-pre-wrap max-h-80 overflow-auto font-mono">
                {doc.text}
              </pre>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
