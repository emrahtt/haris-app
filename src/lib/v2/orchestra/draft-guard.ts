/**
 * Revizyonlar arasında talep, tutar ve çekince ifadelerinin sessizce
 * kaybolmasını yakalayan kural tabanlı kontroller. Model çıktısına
 * güvenmeden, düz metin karşılaştırmasıyla çalışır.
 */

export const FINDING_TAGS = [
  "BELGE",
  "TARAF İDDİASI",
  "ÇIKARIM",
  "HUKUKİ DEĞERLENDİRME",
  "DOĞRULANMADI",
] as const;

export type FindingTag = (typeof FINDING_TAGS)[number];

export interface FindingSummary {
  counts: Record<FindingTag, number>;
  total: number;
  documentsWithoutSource: number;
}

export interface DraftLossReport {
  missingAmounts: string[];
  missingReservations: string[];
  missingNegations: string[];
  missingRequests: string[];
  hasLoss: boolean;
}

const normalize = (text: string) =>
  text
    .toLocaleLowerCase("tr-TR")
    .replace(/<!--.*?-->/gs, " ")
    .replace(/[*_`#>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const unique = (items: string[]) => [...new Set(items.map((item) => item.trim()).filter(Boolean))];

export function extractAmounts(text: string): string[] {
  const matches = text.match(/\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?\s?(?:TL|₺|TRY|USD|EUR|\$|€)/gi) ?? [];
  return unique(matches.map((m) => m.replace(/\s/g, "").toUpperCase().replace("₺", "TL")));
}

export function extractReservations(text: string): string[] {
  const matches = normalize(text).match(/[^.;:\n]{0,60}saklı (?:kalmak|tutulmak|tutarak)[^.;:\n]{0,20}/g) ?? [];
  return unique(matches);
}

export function extractNegations(text: string): string[] {
  const sentences = text.split(/(?<=[.;!?])\s+|\n+/);
  return unique(
    sentences
      .map(normalize)
      .filter((s) => /\b(değil|değildir|bulunmamaktadır|yoktur|kabul etmiyoruz|reddediyoruz)\b/.test(s))
      .map((s) => s.slice(0, 160))
  );
}

export function extractRequests(text: string): string[] {
  const section = text.split(/NET[İI]CE[-\s]?[İI]\s?TALEP|SONUÇ VE İSTEM|TALEP SONUCU/i)[1];
  if (!section) return [];
  return unique(
    section
      .split("\n")
      .map((line) => line.replace(/^\s*(?:\d+[.)-]|[-*•])\s*/, "").trim())
      .filter((line) => line.length > 12 && !/^(tarih|saygılarımla|imza|av\.)/i.test(line))
      .map(normalize)
      .slice(0, 20)
  );
}

const keyWords = (text: string) =>
  normalize(text)
    .split(" ")
    .filter((word) => word.length > 4);

function stillPresent(item: string, revised: string): boolean {
  const revisedNorm = normalize(revised);
  if (revisedNorm.includes(normalize(item))) return true;
  const words = keyWords(item);
  if (words.length === 0) return true;
  const kept = words.filter((word) => revisedNorm.includes(word)).length;
  return kept / words.length >= 0.7;
}

export function compareDrafts(previous: string, revised: string): DraftLossReport {
  const revisedAmounts = new Set(extractAmounts(revised));
  const missingAmounts = extractAmounts(previous).filter((a) => !revisedAmounts.has(a));
  const missingReservations = extractReservations(previous).filter((r) => !stillPresent(r, revised));
  const missingNegations = extractNegations(previous).filter((n) => !stillPresent(n, revised));
  const missingRequests = extractRequests(previous).filter((r) => !stillPresent(r, revised));
  return {
    missingAmounts,
    missingReservations,
    missingNegations,
    missingRequests,
    hasLoss:
      missingAmounts.length + missingReservations.length + missingNegations.length + missingRequests.length > 0,
  };
}

export function describeDraftLoss(report: DraftLossReport): string[] {
  return [
    ...report.missingAmounts.map((a) => `Revizyonda tutar kayboldu: ${a}`),
    ...report.missingRequests.map((r) => `Revizyonda talep kayboldu: ${r}`),
    ...report.missingReservations.map((r) => `Revizyonda çekince ifadesi kayboldu: ${r}`),
    ...report.missingNegations.map((n) => `Revizyonda olumsuz ifade kayboldu veya anlamı değişmiş olabilir: ${n}`),
  ];
}

export function summarizeFindings(text: string): FindingSummary {
  const counts = Object.fromEntries(FINDING_TAGS.map((tag) => [tag, 0])) as Record<FindingTag, number>;
  const tags = text.match(/\[(BELGE|TARAF İDDİASI|ÇIKARIM|HUKUKİ DEĞERLENDİRME|DOĞRULANMADI)(?::[^\]]*)?\]/g) ?? [];
  let documentsWithoutSource = 0;
  for (const tag of tags) {
    const name = tag.slice(1, -1).split(":")[0] as FindingTag;
    counts[name] += 1;
    if (name === "BELGE" && !tag.includes(":")) documentsWithoutSource += 1;
  }
  return { counts, total: tags.length, documentsWithoutSource };
}

export const FINDING_TAG_INSTRUCTIONS = `## BULGU ETİKETLERİ (ZORUNLU)
Her bulgunun başına tam olarak bir etiket koy:
- [BELGE:dosya adı, sayfa] — belgede açıkça yazan bilgi. Sayfa bilinmiyorsa "sayfa belirsiz" yaz, sayfa uydurma.
- [TARAF İDDİASI] — bir tarafın söylediği ama belgeyle kanıtlanmamış bilgi.
- [ÇIKARIM] — belgelerden mantıksal olarak çıkardığın sonuç.
- [HUKUKİ DEĞERLENDİRME] — kanun veya içtihada dayanan yorum.
- [DOĞRULANMADI] — kaynağı bulunamayan veya teyit edilemeyen bilgi.`;

export interface FallbackTarget {
  provider: "anthropic" | "openai";
  modelId: string;
}

export function parseFallbackModel(value: string | undefined): FallbackTarget | null {
  if (!value?.trim()) return null;
  const [first, ...rest] = value.trim().split(":");
  if (rest.length > 0 && (first === "anthropic" || first === "openai")) {
    return { provider: first, modelId: rest.join(":") };
  }
  const modelId = value.trim();
  return { provider: modelId.startsWith("claude") ? "anthropic" : "openai", modelId };
}
