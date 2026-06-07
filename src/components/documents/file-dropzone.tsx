"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X, Check, Loader2, AlertCircle } from "lucide-react";
import { useDocumentUpload, type UploadingFile } from "@/hooks/use-document-upload";
import { formatFileSize } from "@/lib/ingest/types";
import { cn } from "@/lib/cn";

interface Props {
  caseId: string;
  onUploadComplete?: () => void;
  compact?: boolean;
}

const ACCEPTED_TYPES = [
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".md",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".mp3",
  ".wav",
  ".m4a",
];

export function FileDropzone({ caseId, onUploadComplete, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { uploads, isUploading, uploadAll, removeFromList } =
    useDocumentUpload(caseId);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      await uploadAll(arr);
      onUploadComplete?.();
    },
    [uploadAll, onUploadComplete]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl text-center cursor-pointer transition-all",
          compact ? "p-6" : "p-10",
          isDragging
            ? "border-[var(--color-gold)] bg-[var(--color-gold)]/[0.08]"
            : "border-[var(--color-line-2)] hover:border-[var(--color-gold-soft)] hover:bg-[var(--color-gold)]/[0.03]"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <Upload
          size={compact ? 24 : 32}
          strokeWidth={1.5}
          className={cn(
            "mx-auto mb-3 transition-colors",
            isDragging ? "text-[var(--color-gold)]" : "text-[var(--color-gold-bright)]"
          )}
        />
        <div className={cn("font-medium mb-1.5", compact ? "text-[13px]" : "text-[15px]")}>
          {isDragging
            ? "Bırakın, hemen yükleyeyim"
            : "Dosyaları sürükleyin ya da seçmek için tıklayın"}
        </div>
        <div className="text-xs text-[var(--color-text-3)]">
          PDF, DOCX, TXT, JPG, PNG, MP3, WAV — Maks. 50 MB / dosya, çoklu yükleme destekli
        </div>
        <div className="text-[10.5px] text-[var(--color-text-3)] mt-2">
          AI otomatik: metin çıkarma → tür sınıflandırma → tarih + taraf tespiti
        </div>
      </div>

      {/* Upload list */}
      {uploads.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {uploads.map((u) => (
            <UploadRow key={u.id} item={u} onRemove={removeFromList} />
          ))}
        </div>
      )}

      {isUploading && (
        <div className="mt-3 text-[11.5px] text-[var(--color-text-2)] flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin text-[var(--color-info)]" />
          Yükleme ve AI işleme devam ediyor...
        </div>
      )}
    </div>
  );
}

function UploadRow({
  item,
  onRemove,
}: {
  item: UploadingFile;
  onRemove: (id: string) => void;
}) {
  const statusConfig = {
    queued: { icon: Loader2, color: "text-[var(--color-text-3)]", label: "Sırada" },
    uploading: {
      icon: Loader2,
      color: "text-[var(--color-info)]",
      label: "Yükleniyor...",
    },
    processing: {
      icon: Loader2,
      color: "text-[var(--color-warn)]",
      label: "AI analiz ediyor...",
    },
    done: { icon: Check, color: "text-[var(--color-ok)]", label: "Tamamlandı" },
    failed: {
      icon: AlertCircle,
      color: "text-[var(--color-danger)]",
      label: "Başarısız",
    },
  }[item.status];

  const Icon = statusConfig.icon;
  const isAnimated = ["queued", "uploading", "processing"].includes(item.status);

  return (
    <div className="bg-[var(--color-bg-1)] border border-[var(--color-line)] rounded-lg p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded bg-[var(--color-bg-2)] flex items-center justify-center text-[var(--color-gold-bright)] flex-shrink-0">
        <FileText size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium truncate">{item.file.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10.5px] text-[var(--color-text-3)]">
            {formatFileSize(item.file.size)}
          </span>
          <span className={cn("text-[10.5px] flex items-center gap-1", statusConfig.color)}>
            <Icon size={10} className={isAnimated ? "animate-spin" : ""} />
            {statusConfig.label}
          </span>
          {item.result?.classification && (
            <>
              <span className="text-[10.5px] text-[var(--color-text-3)]">•</span>
              <span className="text-[10.5px] bg-[var(--color-gold)]/10 text-[var(--color-gold-bright)] px-1.5 py-0.5 rounded">
                {item.result.classification.docType}
              </span>
              {item.result.classification.isCritical && (
                <span className="text-[10.5px] text-[var(--color-danger)]">
                  ★ kritik
                </span>
              )}
            </>
          )}
          {item.error && (
            <span className="text-[10.5px] text-[var(--color-danger)] truncate">
              {item.error}
            </span>
          )}
        </div>
        {/* Progress bar */}
        {(item.status === "uploading" || item.status === "processing") && (
          <div className="h-1 bg-[var(--color-bg-3)] rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-gold-soft)] to-[var(--color-gold-bright)] transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="text-[var(--color-text-3)] hover:text-[var(--color-danger)] p-1"
        title="Listeden kaldır"
      >
        <X size={14} />
      </button>
    </div>
  );
}
