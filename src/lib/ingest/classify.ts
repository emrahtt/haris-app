/**
 * Belge Sınıflandırma — AI ile
 *
 * Yüklenen belgenin metnini alır, AI'a sınıflandırma + ekstraksiyon yaptırır.
 * Demo modda: kural-tabanlı sınıflandırma (regex + keyword scoring).
 */

import { generateText } from "ai";
import { getModel } from "@/lib/ai/provider";
import { isAiDemoMode, hasOpenAI, hasAnthropic } from "@/lib/ai/config";
import type { LegalDocType } from "./types";

export interface Classification {
  docType: LegalDocType;
  confidence: number;
  isCritical: boolean;
  summary: string;
  dates: string[];
  parties: string[];
  keywords: string[];
}

const CLASSIFY_PROMPT = `Sen HARIS Belge Sınıflandırma uzmanısın. Türk hukukundaki belge tiplerini tanırsın.

Verilen belge metnini analiz et ve aşağıdaki bilgileri **JSON formatında** döndür:

\`\`\`json
{
  "docType": "dilekce|delil|tanik|bilirkisi|atk|karar|tebligat|vekaletname|sozlesme|fatura|kimlik|saglik|diger",
  "confidence": 0.0-1.0,
  "isCritical": true|false,
  "summary": "Belgenin 1-2 cümlelik özeti",
  "dates": ["2024-03-12", "..."],
  "parties": ["A. Yılmaz", "Şahin Otomotiv A.Ş.", "..."],
  "keywords": ["trafik kazası", "maluliyet", "..."]
}
\`\`\`

Kurallar:
- **isCritical** = true: davanın seyrini belirleyecek (kaza tutanağı, ATK raporu, sözleşme, karar) ise true
- **dates**: ISO 8601 formatı (YYYY-MM-DD)
- **parties**: gerçek kişi/şirket isimleri (anonim ifadeler değil)
- **keywords**: 5-10 anahtar kelime, hukuki terimler tercih

SADECE JSON döndür, başka açıklama yapma. JSON kod bloğu içinde.`;

/* ============================================================
   GERÇEK AI SINIFLANDIRMA
   ============================================================ */
async function classifyWithAi(text: string, fileName: string): Promise<Classification> {
  const model = getModel(); // varsayılan
  const truncated = text.slice(0, 6000); // İlk 6K karakter yeterli

  const { text: response } = await generateText({
    model,
    system: CLASSIFY_PROMPT,
    prompt: `Dosya adı: ${fileName}\n\nMetin:\n${truncated}`,
    maxTokens: 800,
    temperature: 0.2,
  });

  // JSON bloğunu çıkar
  const jsonMatch = response.match(/```json\s*([\s\S]*?)```/) ||
                    response.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error("AI'dan geçerli JSON dönmedi");
  }

  const parsed = JSON.parse(jsonMatch[1]);
  return normalizeClassification(parsed);
}

/* ============================================================
   DEMO SINIFLANDIRMA — kural tabanlı
   ============================================================ */
function classifyWithRules(text: string, fileName: string): Classification {
  const lower = (text + " " + fileName).toLowerCase();

  // Tip tahmini — anahtar kelime ağırlıkları
  const scores: Record<LegalDocType, number> = {
    dilekce: 0, delil: 0, tanik: 0, bilirkisi: 0, atk: 0,
    karar: 0, tebligat: 0, vekaletname: 0, sozlesme: 0,
    fatura: 0, kimlik: 0, saglik: 0, diger: 0,
  };

  const RULES: Record<LegalDocType, string[]> = {
    dilekce: ["dilekçe", "açıklamalar", "neticei talep", "saygılarımla", "arz ederim", "vekaleten", "dava dilekçesi", "cevap dilekçesi"],
    delil: ["delil", "kanıt", "tutanak", "fotoğraf", "kaza tespit"],
    tanik: ["tanık beyan", "şahit", "ifade tutanağı", "görgü tanığı", "tanık olarak"],
    bilirkisi: ["bilirkişi", "raporu", "uzman görüş", "teknik inceleme"],
    atk: ["adli tıp", "atk", "maluliyet", "iş gücü kaybı", "psikiyatri rapor"],
    karar: ["karar", "hüküm", "mahkeme kararı", "esas no", "karar no", "yargıtay"],
    tebligat: ["tebligat", "tebliğ", "ihtar", "ihtarname"],
    vekaletname: ["vekaletname", "vekil tayini", "noter"],
    sozlesme: ["sözleşme", "mukavele", "akit", "taraflar arasında"],
    fatura: ["fatura", "makbuz", "tutar", "kdv", "ödeme"],
    kimlik: ["t.c. kimlik", "nüfus cüzdanı", "kimlik no"],
    saglik: ["hastane", "doktor", "tıbbi rapor", "epikriz", "reçete", "ameliyat"],
    diger: [],
  };

  for (const [type, keywords] of Object.entries(RULES)) {
    for (const k of keywords) {
      if (lower.includes(k)) scores[type as LegalDocType] += 1;
    }
  }

  // En yüksek skoru bul
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topType, topScore] = sorted[0];
  const docType = (topScore > 0 ? topType : "diger") as LegalDocType;
  const confidence = Math.min(1, topScore / 3);

  // Kritik mi?
  const criticalTypes: LegalDocType[] = ["dilekce", "karar", "atk", "bilirkisi", "sozlesme"];
  const isCritical = criticalTypes.includes(docType) ||
    /kaza tespit|kusur|%\d+\s*maluliyet|tam kusur/.test(lower);

  // Tarih çıkarma (DD.MM.YYYY veya DD/MM/YYYY)
  const dateMatches = text.match(/\b(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})\b/g) || [];
  const dates = [...new Set(dateMatches)]
    .slice(0, 8)
    .map((d) => {
      const m = d.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
      if (!m) return d;
      const dd = m[1].padStart(2, "0");
      const mm = m[2].padStart(2, "0");
      return `${m[3]}-${mm}-${dd}`;
    });

  // Taraflar — basit isim/şirket tespiti
  const partyMatches = text.match(
    /\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+){1,3}(?:\s+(?:A\.Ş\.|Ltd\.|Şti\.))?/g
  ) || [];
  const parties = [...new Set(partyMatches)]
    .filter((p) => p.length > 5 && p.length < 60)
    .filter((p) => !/^(Sayın|Madde|Aynı|Türk|Genel|Adı|Soyadı|Yargıtay|Anayasa)/.test(p))
    .slice(0, 6);

  // Anahtar kelimeler — top frekanslı uzun kelimeler
  const words = lower.match(/\b[a-zçğıöşüı]{5,}\b/g) || [];
  const wordFreq: Record<string, number> = {};
  const STOP = new Set([
    "olarak", "olduğu", "için", "üzerine", "kadar", "tarafından", "aynı",
    "şekilde", "ancak", "bunun", "hakkında", "bulunan", "değil", "neden",
    "ilişkin", "kapsamında", "açısından", "yapılan", "üzere", "bütün",
    "tarafından", "sebeple", "konusunda",
  ]);
  for (const w of words) {
    if (STOP.has(w)) continue;
    wordFreq[w] = (wordFreq[w] || 0) + 1;
  }
  const keywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);

  // Özet — ilk anlamlı paragraf veya AI olmadığında basit özet
  const summary = (text.split("\n").find((l) => l.trim().length > 40) || text)
    .slice(0, 200)
    .trim() + (text.length > 200 ? "..." : "");

  return {
    docType,
    confidence,
    isCritical,
    summary,
    dates: dates.slice(0, 8),
    parties,
    keywords,
  };
}

/* ============================================================
   NORMALİZASYON
   ============================================================ */
function normalizeClassification(raw: unknown): Classification {
  const r = (raw || {}) as Record<string, unknown>;
  const validTypes: LegalDocType[] = [
    "dilekce", "delil", "tanik", "bilirkisi", "atk", "karar", "tebligat",
    "vekaletname", "sozlesme", "fatura", "kimlik", "saglik", "diger",
  ];
  const docType = validTypes.includes(r.docType as LegalDocType)
    ? (r.docType as LegalDocType)
    : "diger";

  return {
    docType,
    confidence: typeof r.confidence === "number"
      ? Math.max(0, Math.min(1, r.confidence))
      : 0.5,
    isCritical: !!r.isCritical,
    summary: typeof r.summary === "string" ? r.summary.slice(0, 500) : "",
    dates: Array.isArray(r.dates) ? r.dates.slice(0, 10).map(String) : [],
    parties: Array.isArray(r.parties) ? r.parties.slice(0, 10).map(String) : [],
    keywords: Array.isArray(r.keywords) ? r.keywords.slice(0, 12).map(String) : [],
  };
}

/* ============================================================
   PUBLIC API
   ============================================================ */
export async function classifyDocument(
  text: string,
  fileName: string
): Promise<Classification> {
  // Çok kısa metinler için demo
  if (text.length < 30) {
    return classifyWithRules(text, fileName);
  }

  // Demo mode veya AI yoksa kural tabanlı
  if (isAiDemoMode || (!hasOpenAI && !hasAnthropic)) {
    return classifyWithRules(text, fileName);
  }

  try {
    return await classifyWithAi(text, fileName);
  } catch (err) {
    console.warn("[classify] AI başarısız, kural tabanlıya fallback:", err);
    return classifyWithRules(text, fileName);
  }
}
