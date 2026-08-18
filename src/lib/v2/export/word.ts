/**
 * HARIS v2 — Word (.docx) Export
 *
 * Markdown → docx (docx npm paketi ile).
 * Türk hukuk dilekçesi formatına uygun: Times New Roman 12pt, paragraf
 * boşlukları, başlık hiyerarşisi.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  type ParagraphChild,
} from "docx";

export interface WordExportOptions {
  markdown: string;
  title?: string;
  author?: string;
}

export async function exportToWord(opts: WordExportOptions): Promise<Buffer> {
  const paragraphs = parseMarkdownToParagraphs(opts.markdown);

  const doc = new Document({
    creator: opts.author ?? "HARIS Legal AI",
    title: opts.title ?? "Dilekçe",
    description: "HARIS Yapay Zeka Platformu tarafından üretilmiştir",
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24, // 12pt (half-point)
          },
          paragraph: {
            spacing: { after: 200, line: 360 }, // 1.5 satır aralığı
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1417, // 1 inch ~ 2.54 cm = 1440 twips
              right: 1417,
              bottom: 1417,
              left: 1417,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

function parseMarkdownToParagraphs(md: string): Paragraph[] {
  const cleaned = md.replace(/<!--[\s\S]*?-->/g, ""); // HTML yorum kaldır
  const blocks = cleaned.split(/\n\s*\n/).filter((b) => b.trim());
  const paragraphs: Paragraph[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();

    // Başlık 1
    if (trimmed.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^#\s+/, ""),
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
        })
      );
      continue;
    }
    // Başlık 2
    if (trimmed.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^##\s+/, ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }
    // Başlık 3
    if (trimmed.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^###\s+/, ""),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 150, after: 80 },
        })
      );
      continue;
    }

    // Madde işareti listesi
    if (/^[-*+]\s+/.test(trimmed)) {
      const items = trimmed.split(/\n/).filter((l) => l.trim());
      for (const item of items) {
        paragraphs.push(
          new Paragraph({
            children: parseInlineFormatting(
              item.replace(/^[-*+]\s+/, "• ")
            ),
            indent: { left: 360 },
          })
        );
      }
      continue;
    }

    // Numaralı liste
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = trimmed.split(/\n/).filter((l) => l.trim());
      for (const item of items) {
        paragraphs.push(
          new Paragraph({
            children: parseInlineFormatting(item),
            indent: { left: 360 },
          })
        );
      }
      continue;
    }

    // Normal paragraf — satır içi bold/italic destekle
    paragraphs.push(
      new Paragraph({
        children: parseInlineFormatting(trimmed),
        alignment: AlignmentType.JUSTIFIED,
      })
    );
  }

  return paragraphs;
}

function parseInlineFormatting(text: string): ParagraphChild[] {
  const children: ParagraphChild[] = [];
  // Bold: **text**
  // Italic: *text*
  // Basit regex tabanlı tokenizer
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  for (const tok of tokens) {
    if (!tok) continue;
    if (tok.startsWith("**") && tok.endsWith("**")) {
      children.push(
        new TextRun({ text: tok.slice(2, -2), bold: true })
      );
    } else if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
      children.push(
        new TextRun({ text: tok.slice(1, -1), italics: true })
      );
    } else if (tok.startsWith("`") && tok.endsWith("`")) {
      children.push(
        new TextRun({ text: tok.slice(1, -1), font: "Courier New" })
      );
    } else {
      children.push(new TextRun({ text: tok }));
    }
  }
  return children.length > 0 ? children : [new TextRun({ text })];
}
