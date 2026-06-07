import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { extractFromBuffer } from "@/lib/ingest/extract";
import { classifyDocument } from "@/lib/ingest/classify";
import { saveDocument, updateDocument } from "@/lib/ingest/storage";
import {
  getMimeCategory,
  buildStoragePath,
  type UploadedDoc,
} from "@/lib/ingest/types";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * POST /api/documents/upload
 *
 * Multipart form data:
 *   - file: File (binary)
 *   - caseId: string
 *
 * Production-ready pipeline (Faz 6.5):
 *   0. Auth check — kim yüklüyor (RLS için zorunlu)
 *   1. UUID id üret (Faz 6.5: UUID format)
 *   2. Storage path = userId/caseId/uuid-fileName (RLS uyumlu)
 *   3. Storage'a yükle + DB metadata + user_id
 *   4. Metin çıkar + AI sınıflandır + güncelle
 */
export async function POST(req: NextRequest) {
  try {
    // 0) Auth — production'da user_id RLS için zorunlu
    let userId = DEMO_USER.id;
    if (!isDemoMode) {
      const supabase = await createClient();
      if (!supabase) {
        return NextResponse.json(
          { error: "Supabase yapılandırılmamış" },
          { status: 500 }
        );
      }
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr || !user) {
        return NextResponse.json(
          { error: "Oturum gerekli (giriş yapın)" },
          { status: 401 }
        );
      }
      userId = user.id;
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const caseId = formData.get("caseId") as string | null;

    if (!file || !caseId) {
      return NextResponse.json(
        { error: "file ve caseId zorunlu" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Dosya ${MAX_SIZE / 1024 / 1024} MB'ı aşamaz` },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ⭐ Faz 6.5: UUID + storage path
    const id = randomUUID();
    const mimeCategory = getMimeCategory(file.type, file.name);
    const storagePath = buildStoragePath(userId, caseId, id, file.name);

    // 1) İlk kayıt — extracting durumunda
    let doc: UploadedDoc = {
      id,
      caseId,
      userId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      mimeCategory,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      storagePath,
      text: null,
      textLength: 0,
      classification: null,
      status: "extracting",
    };

    await saveDocument(doc, buffer);

    // 2) Metin çıkarma
    const extractResult = await extractFromBuffer(
      buffer,
      doc.mimeType,
      mimeCategory,
      file.name
    );
    doc = {
      ...doc,
      text: extractResult.text,
      textLength: extractResult.text.length,
      status: "classifying",
    };
    await updateDocument(doc);

    // 3) Sınıflandırma
    let classification = null;
    try {
      if (extractResult.text.length > 20) {
        classification = await classifyDocument(extractResult.text, file.name);
      }
    } catch (err) {
      console.warn("[upload] Classification başarısız:", err);
    }

    doc = {
      ...doc,
      classification,
      status: classification ? "ready" : "failed",
      errorMessage: classification
        ? undefined
        : "Belge sınıflandırılamadı (metin çok kısa veya AI hata verdi)",
    };
    await updateDocument(doc);

    return NextResponse.json({
      doc,
      extractMethod: extractResult.method,
      warnings: extractResult.warnings,
    });
  } catch (err) {
    console.error("[documents/upload] Hata:", err);
    return NextResponse.json(
      {
        error: "Yükleme başarısız",
        message: err instanceof Error ? err.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}
