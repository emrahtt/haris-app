/**
 * HARIS v2 — UDF (UYAP Doküman Formatı) Okuyucu
 *
 * UDF dosyaları aslında ZIP arşividir:
 *   - content.xml          → içerik metni + stiller
 *   - documentproperties.xml → UYAP metadata (sicil, doğrulama kodu)
 *   - sign.sgn (opsiyonel)  → e-imza (PKCS#7) — biz yok sayıyoruz
 *
 * Kaynaklar:
 *   - https://www.isikdogan.com/turkce-blog/ucretsiz-uyap-udf-belge-goruntuleyici.html
 *   - https://dev.to/ox3adie1/uyap-udf-dosyalarini-tarayicida-pdfe-ceviren-acik-kaynak-arac-nasil-calisir-42bo
 */

import JSZip from "jszip";

export interface UdfReadResult {
  /** Düz metin içerik — AI sınıflandırması ve RAG için */
  text: string;
  /** Ham XML — debug ve gelişmiş işleme için */
  contentXml?: string;
  propertiesXml?: string;
  /** UYAP metadata (varsa) */
  metadata: {
    sicilNo?: string;
    dogrulamaKodu?: string;
    olusturulmaTarihi?: string;
    yazar?: string;
  };
  /** İmza dosyası var mı? */
  hasSignature: boolean;
  /** Hata varsa */
  error?: string;
}

/**
 * Buffer'dan UDF dosyasını oku, metin + metadata çıkar.
 */
export async function readUdf(buffer: Buffer): Promise<UdfReadResult> {
  try {
    const zip = await JSZip.loadAsync(buffer);

    // İçerik dosyalarını bul (case-insensitive aramayla)
    const fileNames = Object.keys(zip.files);
    const contentFile = fileNames.find(
      (n) => n.toLowerCase() === "content.xml"
    );
    const propertiesFile = fileNames.find(
      (n) => n.toLowerCase() === "documentproperties.xml"
    );
    const signatureFile = fileNames.find(
      (n) => n.toLowerCase().endsWith(".sgn") ||
              n.toLowerCase().includes("sign")
    );

    if (!contentFile) {
      return {
        text: "",
        metadata: {},
        hasSignature: false,
        error:
          "Geçersiz UDF: content.xml bulunamadı. Bu dosya UDF formatında olmayabilir.",
      };
    }

    const contentXml = await zip.files[contentFile].async("string");
    const propertiesXml = propertiesFile
      ? await zip.files[propertiesFile].async("string")
      : undefined;

    // Düz metin çıkar
    const text = extractTextFromContentXml(contentXml);
    const metadata = propertiesXml ? parseProperties(propertiesXml) : {};

    return {
      text,
      contentXml,
      propertiesXml,
      metadata,
      hasSignature: !!signatureFile,
    };
  } catch (e) {
    return {
      text: "",
      metadata: {},
      hasSignature: false,
      error: `UDF parse hatası: ${String(e)}`,
    };
  }
}

/**
 * content.xml'den düz metin çıkar.
 * UDF XML'de tipik yapı: <content>...</content> + <elements><paragraph>...
 * Birden fazla şema varyantı destekliyoruz.
 */
function extractTextFromContentXml(xml: string): string {
  // 1. CDATA bloğu varsa onu öncelikle al (UDF'in tipik yapısı)
  const cdataMatch = xml.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdataMatch && cdataMatch[1].trim().length > 30) {
    return decodeXmlEntities(cdataMatch[1]).trim();
  }

  // 2. <content>...</content> bloğunun içindeki metin
  const contentBlock = xml.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
  let inner = contentBlock ? contentBlock[1] : xml;

  // 3. Paragraf/satır XML tag'lerini newline ile değiştir
  inner = inner
    .replace(/<\/(paragraph|para|p|line|br)\s*>/gi, "\n")
    .replace(/<(br|line)\s*\/>/gi, "\n");

  // 4. Geri kalan tüm tag'leri çıkar
  const plain = inner.replace(/<[^>]+>/g, "");

  // 5. XML entity'leri çöz
  return decodeXmlEntities(plain)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) =>
      String.fromCharCode(parseInt(n, 16))
    );
}

function parseProperties(xml: string): UdfReadResult["metadata"] {
  const meta: UdfReadResult["metadata"] = {};
  const sicil = xml.match(/<sicilNo[^>]*>([^<]+)<\/sicilNo>/i);
  if (sicil) meta.sicilNo = sicil[1].trim();
  const dogrulama = xml.match(
    /<dogrulamaKodu[^>]*>([^<]+)<\/dogrulamaKodu>/i
  );
  if (dogrulama) meta.dogrulamaKodu = dogrulama[1].trim();
  const tarih = xml.match(
    /<(olusturma|olusturulma|creation)[^>]*>([^<]+)<\/(olusturma|olusturulma|creation)>/i
  );
  if (tarih) meta.olusturulmaTarihi = tarih[2].trim();
  const yazar = xml.match(/<(yazar|author)[^>]*>([^<]+)<\/(yazar|author)>/i);
  if (yazar) meta.yazar = yazar[2].trim();
  return meta;
}

/** MIME / uzantı kontrolü */
export function isUdfFile(filename: string, mimeType?: string): boolean {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".udf")) return true;
  if (mimeType === "application/octet-stream" && lower.endsWith(".udf")) return true;
  if (mimeType?.includes("udf")) return true;
  return false;
}
