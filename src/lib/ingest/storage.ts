/**
 * Belge Depolama (Storage) — Faz 6.5 hardening
 *
 * - Supabase yapılandırılmışsa: Supabase Storage bucket + DB row + user_id + RLS-uyumlu path
 * - Yoksa: In-memory store (sadece dev/demo için)
 */

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";
import type { UploadedDoc } from "./types";

/* ============================================================
   IN-MEMORY STORE (Demo)
   ============================================================ */
const memoryStore = new Map<string, UploadedDoc>();
const memoryFiles = new Map<string, { buffer: Buffer; mime: string }>();

/* ============================================================
   PUBLIC API
   ============================================================ */

export async function saveDocument(
  doc: UploadedDoc,
  buffer: Buffer
): Promise<UploadedDoc> {
  if (isDemoMode) {
    memoryStore.set(doc.id, doc);
    memoryFiles.set(doc.id, { buffer, mime: doc.mimeType });
    return doc;
  }

  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase istemcisi yok");

  // 1) Storage'a yükle (path: userId/caseId/docId-fileName — RLS uyumlu)
  const { error: uploadErr } = await supabase.storage
    .from("case-documents")
    .upload(doc.storagePath, buffer, {
      contentType: doc.mimeType,
      upsert: false,
    });
  if (uploadErr) throw uploadErr;

  // 2) Metadata'yı DB'ye yaz (id UUID, user_id zorunlu)
  const { error: dbErr } = await supabase.from("documents").insert({
    id: doc.id,
    case_id: doc.caseId,
    user_id: doc.userId,
    name: doc.fileName,
    type: doc.mimeType,
    tag: doc.classification?.docType || "diger",
    size_bytes: doc.sizeBytes,
    storage_path: doc.storagePath,
    is_critical: doc.classification?.isCritical || false,
    ocr_text: doc.text,
  });
  if (dbErr) {
    // Yarıda kalan storage'ı temizle
    await supabase.storage.from("case-documents").remove([doc.storagePath]);
    throw dbErr;
  }

  return doc;
}

export async function updateDocument(doc: UploadedDoc): Promise<UploadedDoc> {
  if (isDemoMode) {
    memoryStore.set(doc.id, doc);
    return doc;
  }

  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase istemcisi yok");

  // RLS: user_id kontrolü — kendi belgesinden başkasını güncelleyemez
  const { error } = await supabase
    .from("documents")
    .update({
      tag: doc.classification?.docType || "diger",
      is_critical: doc.classification?.isCritical || false,
      ocr_text: doc.text,
    })
    .eq("id", doc.id)
    .eq("user_id", doc.userId);

  if (error) throw error;
  return doc;
}

export async function listDocuments(
  caseId: string,
  userId?: string
): Promise<UploadedDoc[]> {
  if (isDemoMode) {
    return Array.from(memoryStore.values())
      .filter((d) => d.caseId === caseId)
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
  }

  const supabase = await createClient();
  if (!supabase) return [];

  // RLS zaten user_id filtresi yapar ama açıkça da ekleyelim (defansif)
  let query = supabase
    .from("documents")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) {
    console.error("[listDocuments] hata:", error);
    return [];
  }
  return (data || []).map(dbRowToDoc);
}

export async function getDocument(
  docId: string,
  userId?: string
): Promise<UploadedDoc | null> {
  if (isDemoMode) {
    return memoryStore.get(docId) || null;
  }

  const supabase = await createClient();
  if (!supabase) return null;

  let query = supabase.from("documents").select("*").eq("id", docId);
  if (userId) query = query.eq("user_id", userId);

  const { data } = await query.maybeSingle();
  return data ? dbRowToDoc(data) : null;
}

export async function deleteDocument(
  docId: string,
  userId: string
): Promise<boolean> {
  if (isDemoMode) {
    memoryStore.delete(docId);
    memoryFiles.delete(docId);
    return true;
  }

  const supabase = await createClient();
  if (!supabase) return false;

  const doc = await getDocument(docId, userId);
  if (!doc) return false; // RLS: başkasının belgesini silemez

  await supabase.storage.from("case-documents").remove([doc.storagePath]);
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", docId)
    .eq("user_id", userId);

  return !error;
}

/* ============================================================
   YARDIMCI
   ============================================================ */

function dbRowToDoc(row: Record<string, unknown>): UploadedDoc {
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    userId: (row.user_id as string) || "",
    fileName: row.name as string,
    mimeType: row.type as string,
    mimeCategory: "unknown",
    sizeBytes: (row.size_bytes as number) || 0,
    uploadedAt: (row.created_at as string) || new Date().toISOString(),
    storagePath: (row.storage_path as string) || "",
    text: (row.ocr_text as string) || null,
    textLength: ((row.ocr_text as string) || "").length,
    classification: row.tag
      ? {
          docType: row.tag as UploadedDoc["classification"] extends infer T
            ? T extends { docType: infer D }
              ? D
              : never
            : never,
          confidence: 1,
          isCritical: !!row.is_critical,
          summary: "",
          dates: [],
          parties: [],
          keywords: [],
        } as UploadedDoc["classification"]
      : null,
    status: "ready",
  };
}

export function _clearDemoStore() {
  memoryStore.clear();
  memoryFiles.clear();
}
