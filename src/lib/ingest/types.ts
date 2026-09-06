/**
 * HARIS Dosya Sindirim — Tip Tanımları
 */

export type DocMimeCategory =
  | "pdf"
  | "word"
  | "image"
  | "audio"
  | "text"
  | "spreadsheet"
  | "archive"
  | "unknown";

export type LegalDocType =
  | "dilekce"
  | "delil"
  | "tanik"
  | "bilirkisi"
  | "atk"
  | "karar"
  | "tebligat"
  | "vekaletname"
  | "sozlesme"
  | "fatura"
  | "kimlik"
  | "saglik"
  | "diger";

export interface UploadedDoc {
  id: string; // UUID v4
  caseId: string;
  /** Kim yükledi (auth.uid) — RLS için zorunlu */
  userId: string;
  fileName: string;
  mimeType: string;
  mimeCategory: DocMimeCategory;
  sizeBytes: number;
  uploadedAt: string;
  /** Storage tam path: {userId}/{caseId}/{docId}-{fileName} */
  storagePath: string;
  text: string | null;
  textLength: number;
  classification: {
    docType: LegalDocType;
    confidence: number;
    isCritical: boolean;
    summary: string;
    dates: string[];
    parties: string[];
    keywords: string[];
  } | null;
  status: "uploading" | "extracting" | "classifying" | "ready" | "failed";
  errorMessage?: string;
}

export interface IngestResult {
  text: string;
  pageCount?: number;
  method:
    | "pdf-parse"
    | "mammoth"
    | "ocr-demo"
    | "transcript-demo"
    | "text-direct"
    | "unsupported";
  warnings: string[];
}

export const MIME_CATEGORIES: Record<string, DocMimeCategory> = {
  "application/pdf": "pdf",
  "application/msword": "word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word",
  "application/vnd.ms-excel": "spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "spreadsheet",
  "text/csv": "spreadsheet",
  "text/plain": "text",
  "text/markdown": "text",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
  "audio/webm": "audio",
  "application/zip": "archive",
};

export function getMimeCategory(
  mimeType: string,
  fileName?: string
): DocMimeCategory {
  const direct = MIME_CATEGORIES[mimeType];
  if (direct) return direct;

  // Uzantı fallback'i (bazı tarayıcılar/CLI yanlış MIME gönderir)
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (["pdf"].includes(ext)) return "pdf";
    if (["doc", "docx", "rtf"].includes(ext)) return "word";
    if (["xls", "xlsx", "csv"].includes(ext)) return "spreadsheet";
    if (["txt", "md"].includes(ext)) return "text";
    if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext)) return "image";
    if (["mp3", "wav", "ogg", "m4a", "webm", "flac"].includes(ext)) return "audio";
    if (["zip", "rar", "7z"].includes(ext)) return "archive";
  }

  return "unknown";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Güvenli storage path üretici: özel karakterleri temizler */
export function buildStoragePath(
  userId: string,
  caseId: string,
  docId: string,
  fileName: string
): string {
  // Storage path: userId/caseId/docId-safeName
  // (Migration 0002 RLS: ilk klasör auth.uid() olmalı)
  const safeName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
  return `${userId}/${caseId}/${docId}-${safeName}`;
}

export const LEGAL_DOC_TYPE_LABELS: Record<LegalDocType, string> = {
  dilekce: "Dilekçe",
  delil: "Delil",
  tanik: "Tanık Beyanı",
  bilirkisi: "Bilirkişi Raporu",
  atk: "ATK / Adli Tıp",
  karar: "Mahkeme Kararı",
  tebligat: "Tebligat",
  vekaletname: "Vekaletname",
  sozlesme: "Sözleşme",
  fatura: "Fatura/Makbuz",
  kimlik: "Kimlik",
  saglik: "Sağlık Raporu",
  diger: "Diğer",
};
