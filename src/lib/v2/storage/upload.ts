/**
 * HARIS v2 — Supabase Storage Helper
 *
 * Belgeleri "workspace-documents" bucket'ına yükler.
 * Demo modda no-op (orijinal byte'lar bellek dışına gitmez, sadece extracted_text).
 *
 * Bucket yapısı:
 *   workspace-documents/{userId}/{workspaceId}/{docId}_{filename}
 */

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";

const BUCKET = "workspace-documents";

export interface UploadResult {
  storagePath?: string;
  publicUrl?: string;
  error?: string;
}

export async function uploadDocumentToStorage(
  userId: string,
  workspaceId: string,
  docId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<UploadResult> {
  if (isDemoMode || userId === "demo-user-haris-2026") {
    return {
      storagePath: `demo://${workspaceId}/${docId}_${filename}`,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { error: "Supabase client alınamadı" };
  }

  const safeFilename = filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
  const storagePath = `${userId}/${workspaceId}/${docId}_${safeFilename}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      // Bucket yoksa otomatik oluştur denemesi
      if (uploadError.message?.includes("not found") || uploadError.message?.includes("bucket")) {
        return {
          error: `Bucket "${BUCKET}" Supabase'de oluşturulmalı. Dashboard → Storage → New bucket.`,
        };
      }
      return { error: uploadError.message };
    }

    return { storagePath };
  } catch (e) {
    return { error: String(e).slice(0, 200) };
  }
}

export async function getDocumentDownloadUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (storagePath.startsWith("demo://")) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function deleteDocumentFromStorage(
  storagePath: string
): Promise<boolean> {
  if (storagePath.startsWith("demo://")) return true;
  const supabase = await createClient();
  if (!supabase) return false;
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  return !error;
}
