/**
 * HARIS v2 — PDF Export
 *
 * Markdown → PDF (pdfkit ile, saf JS, puppeteer'a göre 100x daha hafif).
 * Türk hukuk dilekçesi formatı.
 *
 * NOT: pdfkit Türkçe karakter için Helvetica yerine TTF font gerekiyor olabilir.
 * Şimdilik pdfkit'in default Helvetica'sı kullanılıyor; üretimde DejaVu/Inter
 * TTF ekleyebiliriz.
 */

import PDFDocument from "pdfkit";

export interface PdfExportOptions {
  markdown: string;
  title?: string;
  author?: string;
}

export async function exportToPdf(opts: PdfExportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 60,
        info: {
          Title: opts.title ?? "Dilekçe",
          Author: opts.author ?? "HARIS Legal AI",
          Creator: "HARIS Legal AI Platform",
          Producer: "HARIS Legal AI Platform",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Başlık (eğer varsa)
      if (opts.title) {
        doc
          .fontSize(16)
          .font("Helvetica-Bold")
          .text(opts.title, { align: "center" })
          .moveDown(0.8);
      }

      // İçerik
      renderMarkdown(doc, opts.markdown);

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        const bottomY = doc.page.height - 40;
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#666666")
          .text(
            `HARIS Legal AI · Sayfa ${i + 1}/${pageCount}`,
            60,
            bottomY,
            { align: "center", width: doc.page.width - 120 }
          )
          .fillColor("#000000");
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

function renderMarkdown(doc: PDFKit.PDFDocument, md: string): void {
  const cleaned = md.replace(/<!--[\s\S]*?-->/g, "");
  const blocks = cleaned.split(/\n\s*\n/).filter((b) => b.trim());

  for (const block of blocks) {
    const trimmed = block.trim();

    if (trimmed.startsWith("# ")) {
      doc
        .moveDown(0.4)
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(trimmed.replace(/^#\s+/, ""), { align: "center" })
        .moveDown(0.4);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      doc
        .moveDown(0.3)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(trimmed.replace(/^##\s+/, ""))
        .moveDown(0.2);
      continue;
    }
    if (trimmed.startsWith("### ")) {
      doc
        .moveDown(0.2)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(trimmed.replace(/^###\s+/, ""))
        .moveDown(0.15);
      continue;
    }

    // List or paragraph
    doc.fontSize(11).font("Helvetica");
    renderInline(doc, trimmed);
    doc.moveDown(0.5);
  }
}

function renderInline(doc: PDFKit.PDFDocument, text: string): void {
  // Basit yaklaşım: **bold** ve *italic* için ayrı text() çağrıları
  // Continuous rendering için continued:true kullanıyoruz
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue;
    const isLast = i === tokens.length - 1;
    if (tok.startsWith("**") && tok.endsWith("**")) {
      doc.font("Helvetica-Bold").text(tok.slice(2, -2), {
        continued: !isLast,
        align: "justify",
      });
      doc.font("Helvetica");
    } else if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
      doc.font("Helvetica-Oblique").text(tok.slice(1, -1), {
        continued: !isLast,
        align: "justify",
      });
      doc.font("Helvetica");
    } else {
      doc.text(tok, { continued: !isLast, align: "justify" });
    }
  }
}
