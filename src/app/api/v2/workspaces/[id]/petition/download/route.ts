/**
 * GET /api/v2/workspaces/[id]/petition/download?format=md|txt|udf|docx|pdf
 *
 * Son dilekçe versiyonunu indirir.
 */

import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import { getLatestPetition, getWorkspace } from "@/lib/v2/workspace/db";
import { writeUdf } from "@/lib/v2/udf/writer";
import { exportToWord } from "@/lib/v2/export/word";
import { exportToPdf } from "@/lib/v2/export/pdf";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) {
    return new Response("Workspace yok", { status: 404 });
  }
  const petition = await getLatestPetition(id);
  if (!petition) {
    return new Response("Henüz dilekçe yok", { status: 404 });
  }

  const format = (req.nextUrl.searchParams.get("format") || "md").toLowerCase();
  const sanitizedTitle = ws.title.replace(/[^\p{L}\p{N}_-]/gu, "_").slice(0, 60);

  try {
    // ── UDF ────────────────────────────────────────────
    if (format === "udf") {
      const udfBuffer = await writeUdf({
        text: petition.markdown,
        title: ws.title,
        author: "HARIS Legal AI",
      });
      return binaryResponse(
        udfBuffer,
        `${sanitizedTitle}_dilekce_v${petition.version}.udf`,
        "application/octet-stream"
      );
    }

    // ── DOCX ───────────────────────────────────────────
    if (format === "docx") {
      const docxBuffer = await exportToWord({
        markdown: petition.markdown,
        title: ws.title,
        author: "HARIS Legal AI",
      });
      return binaryResponse(
        docxBuffer,
        `${sanitizedTitle}_dilekce_v${petition.version}.docx`,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    }

    // ── PDF ────────────────────────────────────────────
    if (format === "pdf") {
      const pdfBuffer = await exportToPdf({
        markdown: petition.markdown,
        title: ws.title,
        author: "HARIS Legal AI",
      });
      return binaryResponse(
        pdfBuffer,
        `${sanitizedTitle}_dilekce_v${petition.version}.pdf`,
        "application/pdf"
      );
    }

    // ── MD / TXT ───────────────────────────────────────
    let content = petition.markdown;
    if (format === "txt") {
      content = petition.markdown
        .replace(/<!-- src:[^>]*-->/g, "")
        .replace(/^#+\s+/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    }
    const filename = `${sanitizedTitle}_dilekce_v${petition.version}.${format}`;
    return new Response(content, {
      headers: {
        "Content-Type":
          format === "md"
            ? "text/markdown; charset=utf-8"
            : "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (e) {
    return new Response(`Export hatası (${format}): ${String(e)}`, {
      status: 500,
    });
  }
}

function binaryResponse(
  buffer: Buffer,
  filename: string,
  contentType: string
): Response {
  const body = new Uint8Array(buffer);
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Content-Length": String(body.length),
    },
  });
}
