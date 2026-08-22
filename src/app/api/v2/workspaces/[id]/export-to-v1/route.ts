/**
 * POST /api/v2/workspaces/[id]/export-to-v1
 *
 * V2 Matter Workspace'i V1 sistemi (cases + documents + petitions) tablolarına
 * aktarır. Böylece V1'in eski özelliklerini de kullanabilir.
 *
 * V2 → V1 mapping:
 *   workspaces          → cases
 *   workspace_documents → documents
 *   petition_versions   → petitions (son version)
 *   matter_memory       → cases.metadata (jsonb)
 *   agent_messages      → cases.notes (özet)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import {
  getWorkspace,
  listDocuments,
  listAgentMessages,
  getLatestPetition,
} from "@/lib/v2/workspace/db";
import { getMatterMemory } from "@/lib/v2/memory/db";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) {
    return NextResponse.json({ error: "Workspace yok" }, { status: 404 });
  }

  if (isDemoMode) {
    return NextResponse.json(
      { error: "Bu özellik gerçek Supabase ile çalışır (demo modda değil)" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase yok" }, { status: 500 });
  }

  const [documents, messages, petition, memory] = await Promise.all([
    listDocuments(id),
    listAgentMessages(id),
    getLatestPetition(id),
    getMatterMemory(id, userId),
  ]);

  // Chat özeti
  const chatSummary = messages
    .filter((m) => m.type === "user_chat" || m.type === "agent_chat")
    .slice(-20)
    .map((m) => `[${m.from}] ${m.content.slice(0, 200)}`)
    .join("\n\n");

  try {
    const metadata = {
      v2_workspace_id: id,
      v2_memory: memory,
      v2_document_count: documents.length,
      imported_at: new Date().toISOString(),
      case_type: ws.case_type,
    };

    // Aynı workspace daha önce aktarıldıysa üzerine yaz (çift case üretme)
    const { data: existing } = await supabase
      .from("cases")
      .select("id")
      .eq("user_id", userId)
      .contains("metadata", { v2_workspace_id: id })
      .maybeSingle();

    let caseRow: { id: string } | null = existing;

    if (caseRow) {
      const { error: updErr } = await supabase
        .from("cases")
        .update({
          title: ws.title,
          description: ws.case_description || "",
          summary: ws.case_description || "",
          case_type: ws.case_type || "diğer",
          notes: chatSummary,
          metadata,
        })
        .eq("id", caseRow.id);
      if (updErr) {
        return NextResponse.json(
          { error: `Case güncelleme hatası: ${updErr.message}` },
          { status: 500 }
        );
      }
    } else {
      const { data: inserted, error: caseErr } = await supabase
        .from("cases")
        .insert({
          user_id: userId,
          title: ws.title,
          description: ws.case_description || "",
          summary: ws.case_description || "",
          case_type: ws.case_type || "diğer",
          status: "active",
          notes: chatSummary,
          metadata,
        })
        .select()
        .single();

      if (caseErr) {
        return NextResponse.json(
          { error: `Case oluşturma hatası: ${caseErr.message}` },
          { status: 500 }
        );
      }
      caseRow = inserted;
    }

    if (!caseRow) {
      return NextResponse.json({ error: "Case oluşturulamadı" }, { status: 500 });
    }

    // 2. Belgeleri V1 documents tablosuna kopyala
    let docCount = 0;
    for (const doc of documents) {
      const { error: docErr } = await supabase.from("documents").insert({
        user_id: userId,
        case_id: caseRow.id,
        filename: doc.filename,
        mime_type: doc.mimeType,
        size_bytes: doc.sizeBytes,
        category: doc.category,
        summary: doc.summary,
        extracted_text: doc.extractedText,
        status: doc.status,
      });
      if (!docErr) docCount++;
    }

    // 3. Petition'ı V1 petitions tablosuna
    if (petition) {
      await supabase.from("petitions").insert({
        user_id: userId,
        case_id: caseRow.id,
        title: `Dilekçe v${petition.version}`,
        content_markdown: petition.markdown,
        author: "v2_import",
      });
    }

    return NextResponse.json({
      ok: true,
      caseId: caseRow.id,
      caseUrl: `/cases/${caseRow.id}`,
      stats: {
        documentsCopied: docCount,
        hasPetition: !!petition,
        messagesInSummary: messages.length,
        memoryBlocks:
          memory.entities.length +
          memory.facts.length +
          memory.decisions.length +
          memory.userNotes.length,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e).slice(0, 300) },
      { status: 500 }
    );
  }
}
