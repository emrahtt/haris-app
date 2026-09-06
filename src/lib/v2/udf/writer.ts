/**
 * HARIS v2 — UDF (UYAP Doküman Formatı) Üretici
 *
 * HARIS'in ürettiği dilekçeleri UYAP'a uyumlu .udf formatında çıktı verir.
 *
 * ÖNEMLİ: UDF resmi şeması açık değil, format reverse-engineering ile çıkarıldı.
 * UYAP Doküman Editörü farklı XML şemaları kabul edebilir. Test edilmiş yapı:
 *   - content.xml: <template format_id="1.8"><content>CDATA</content><elements>...</elements></template>
 *   - documentproperties.xml: metadata
 *
 * Resmi UYAP Editörü ile açılmaz ise:
 *   - Kullanıcı Word'e kopyala/yapıştır yapar
 *   - PDF/Word export alternatifi kullanır
 *
 * Bu yüzden ÇIKTI dosyası güvenli denedik ama %100 garanti vermiyoruz.
 */

import JSZip from "jszip";

export interface UdfWriteOptions {
  /** Düz metin içerik (Markdown sentaksından çıkarılmış olmalı) */
  text: string;
  /** Belge başlığı (opsiyonel) */
  title?: string;
  /** Yazar adı (opsiyonel) */
  author?: string;
  /** Oluşturma tarihi (default: şimdi) */
  date?: Date;
}

/**
 * Markdown'dan UDF Buffer üret.
 * Geri dönen Buffer doğrudan .udf dosyası olarak yazılabilir / response edilebilir.
 */
export async function writeUdf(opts: UdfWriteOptions): Promise<Buffer> {
  const date = opts.date ?? new Date();
  const isoDate = date.toISOString();
  const trDate = date.toLocaleDateString("tr-TR");

  // Markdown'ı sade metne çevir (zaten yapılmış olmalı ama emin olalım)
  const plainText = markdownToPlainText(opts.text);

  // UDF XML şeması — format_id 1.8 UYAP Doküman Editörü 2024+ ile uyumlu
  const contentXml = buildContentXml(plainText, opts.title);
  const propertiesXml = buildPropertiesXml({
    title: opts.title,
    author: opts.author,
    date: isoDate,
    trDate,
  });

  const zip = new JSZip();
  zip.file("content.xml", contentXml);
  zip.file("documentproperties.xml", propertiesXml);

  // ZIP buffer üret (UDF binary'sini)
  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return buffer;
}

/**
 * Markdown sentaksını sade metne çevirir.
 * UDF text içerikte markdown render etmez, sade satır metni bekler.
 */
function markdownToPlainText(md: string): string {
  return md
    .replace(/<!--[\s\S]*?-->/g, "") // HTML yorumlarını kaldır (örn. <!-- src:maddi_hukuk -->)
    .replace(/^#{1,6}\s+/gm, "") // Markdown başlıklarını kaldır
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/\*([^*]+)\*/g, "$1") // italic
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/```[\s\S]*?```/g, "") // code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links: keep text
    .replace(/^\s*[-*+]\s+/gm, "• ") // list bullets
    .replace(/^\s*\d+\.\s+/gm, (match) => match) // numbered lists keep as is
    .replace(/\|/g, " | ") // tables: simple format
    .replace(/^-{3,}$/gm, "──────────") // hr
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * UDF content.xml inşa eder.
 *
 * Şema (UYAP Doküman Editörü 1.x ile uyumlu):
 * <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
 * <template format_id="1.8">
 *   <content>
 *     <![CDATA[Düz metin içerik]]>
 *   </content>
 *   <properties>
 *     <pageFormat>...</pageFormat>
 *   </properties>
 *   <styles>...</styles>
 *   <elements resolver="hvl-default">
 *     <paragraph>...</paragraph>
 *   </elements>
 * </template>
 */
function buildContentXml(text: string, _title?: string): string {
  // CDATA içine ]]> kaçışı
  const safeText = text.replace(/\]\]>/g, "]]]]><![CDATA[>");

  // Paragrafları XML <paragraph> elementlerine çevir (UYAP editörü gerektiriyor)
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const elements = paragraphs
    .map((p) => {
      const len = p.length;
      // XML escape paragraph içeriği
      const escaped = p
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `        <paragraph Alignment="0" LeftIndent="0" RightIndent="0" FirstLineIndent="0" LineSpacing="1.0" SpaceAbove="0" SpaceBelow="6">
            <content startOffset="0" length="${len}" />
        </paragraph>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<template format_id="1.8">
    <content>
        <![CDATA[${safeText}]]>
    </content>
    <properties>
        <pageFormat mediaSizeName="1" leftMargin="42.5" rightMargin="42.5" topMargin="42.5" bottomMargin="42.5" paperOrientation="1" headerFOffset="20.0" footerFOffset="20.0" />
    </properties>
    <styles>
        <style name="default" family="Dialog" size="12" bold="false" italic="false" />
        <style name="hvl-default" family="Times New Roman" size="12" bold="false" italic="false" />
    </styles>
    <elements resolver="hvl-default">
${elements}
    </elements>
</template>`;
}

function buildPropertiesXml(opts: {
  title?: string;
  author?: string;
  date: string;
  trDate: string;
}): string {
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<documentProperties>
    <title>${escapeXml(opts.title ?? "HARIS Dilekçesi")}</title>
    <author>${escapeXml(opts.author ?? "HARIS Legal AI")}</author>
    <olusturmaTarihi>${escapeXml(opts.trDate)}</olusturmaTarihi>
    <creationDate>${escapeXml(opts.date)}</creationDate>
    <generator>HARIS Legal AI Platform</generator>
    <generatorVersion>1.0</generatorVersion>
    <notice>Bu belge HARIS yapay zekâ platformu tarafından oluşturulmuştur. UYAP'a yüklenmeden önce kullanıcı tarafından incelenmesi gerekir.</notice>
</documentProperties>`;
  return xml;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
