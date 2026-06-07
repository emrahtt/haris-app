import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { search } from "@/lib/rag/store";
import type { DocCategory, LegalArea } from "@/lib/rag/corpus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  query: z.string().min(2).max(500),
  topK: z.number().int().min(1).max(50).optional(),
  categories: z
    .array(
      z.enum(["yargitay", "danistay", "aym", "aihm", "mevzuat", "doktrin"])
    )
    .optional(),
  areas: z
    .array(
      z.enum([
        "tazminat",
        "is",
        "ticari",
        "aile",
        "ceza",
        "icra",
        "idari",
        "gayri",
        "anayasa",
        "usul",
        "genel",
      ])
    )
    .optional(),
  lexicalWeight: z.number().min(0).max(1).optional(),
});

/**
 * POST /api/research/search
 *
 * Türk hukuku bilgi tabanında semantic+lexical hybrid arama.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz istek", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const start = Date.now();
    const results = await search(parsed.data.query, {
      topK: parsed.data.topK ?? 10,
      categories: parsed.data.categories as DocCategory[] | undefined,
      areas: parsed.data.areas as LegalArea[] | undefined,
      lexicalWeight: parsed.data.lexicalWeight,
    });
    const duration = Date.now() - start;

    return NextResponse.json({
      query: parsed.data.query,
      count: results.length,
      durationMs: duration,
      results: results.map((r) => ({
        id: r.doc.id,
        title: r.doc.title,
        category: r.doc.category,
        areas: r.doc.areas,
        court: r.doc.court,
        caseNo: r.doc.caseNo,
        date: r.doc.date,
        lawName: r.doc.lawName,
        articleNo: r.doc.articleNo,
        snippet: r.doc.content.slice(0, 400),
        content: r.doc.content,
        tags: r.doc.tags,
        score: r.score,
        semanticScore: r.semanticScore,
        lexicalScore: r.lexicalScore,
        matchedTerms: r.matchedTerms,
      })),
    });
  } catch (err) {
    console.error("[research/search] Hata:", err);
    return NextResponse.json(
      {
        error: "Arama başarısız",
        message: err instanceof Error ? err.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}
