/**
 * HARIS v2 — Kanıt Temelli Veri Modeli
 *
 * Dilekçenin her iddiası yapılandırılmış bir kanıt modeliyle çalışır:
 * İddia, kanun maddesi, delil (belge + sayfa), içtihat, karşı argüman, güven seviyesi.
 *
 * Amaç: "Doğrulanmış iddia" ve "desteksiz iddia" kalitatif fark sağlamak.
 */

import { z } from "zod";

/** Bir belgedeki sayfa veya bölüme referans */
export const EvidenceRefSchema = z.object({
  documentId: z.string(),
  filename: z.string(),
  pageNumber: z.number().optional(), // OCR varsa sayfa no
  startChar: z.number().optional(), // Belge içindeki başlangıç karakteri
  endChar: z.number().optional(),
  excerpt: z.string().optional(), // "...xyz..." şeklinde alıntı
  confidence: z.number().min(0).max(1).default(0.7), // Doğruluk güveni: 0.7 = "muhtemelen bu"
});

export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

/** Hukuk madde referansı */
export const LegalBasisSchema = z.object({
  code: z.string(), // "TBK", "HMK", "TTK" vb.
  article: z.string(), // "m.49", "m.2", vb.
  fullText: z.string().optional(), // Maddenin tam metni (erişildiyse)
  isConfirmed: z.boolean().default(false), // Doğrulama ajanı tarafından kontrol edildi mi?
  note: z.string().optional(), // "Kısıtlama", "Tartışmalı", vb.
});

export type LegalBasis = z.infer<typeof LegalBasisSchema>;

/** İçtihat referansı */
export const CitationSchema = z.object({
  court: z.enum(["Yargıtay", "Danıştay", "AYM", "AİHM"]),
  decisionNumber: z.string(), // "2021/1234"
  year: z.number().optional(),
  isFound: z.boolean().default(false), // Bedesten'de bulundu mu?
  excerpt: z.string().optional(), // Karar metninden alınan ilgili paragraf
  relevantParagraph: z.string().optional(), // "Paragraf 3" vb.
  confidence: z.number().min(0).max(1).default(0.5), // Davamızla uyum: 0.5 = "belirsiz"
  status: z.enum(["found", "hallucination_risk", "unverified"]).default("unverified"),
});

export type Citation = z.infer<typeof CitationSchema>;

/** Ana iddia (her paragrafın temelinde) */
export const LegalClaimSchema = z.object({
  id: z.string(), // UUID
  claimText: z.string(), // "Taraf X'in zarar gördüğü" vb.
  claimType: z.enum([
    "fact", // "Olayın gerçekleştiği"
    "legal_right", // "Taraflı X'in Y hakkı var"
    "breach", // "B, Y hakkını ihlal etti"
    "damage", // "Zarar miktarı Z TL"
    "relief", // "Talep: Z TL tazminat"
    "procedural", // "Mahkeme görevli"
  ]),

  // Kanıt: hangi belgelerle destekleniyor?
  evidence: z.array(EvidenceRefSchema).default([]),
  
  // Hukuk: hangi maddelere dayalı?
  legalBases: z.array(LegalBasisSchema).default([]),
  
  // İçtihat: hangi kararlarla destekleniyor?
  citations: z.array(CitationSchema).default([]),

  // Karşı argüman: muhtemel karşı dava yanıtı
  counterArgument: z.string().optional(),
  ourRebuttal: z.string().optional(), // Cevabımız

  // Kalite metriği
  confidenceScore: z.number().min(0).max(1).default(0.5), // Tüm kaynaklar birleştirilince
  status: z.enum([
    "unverified", // Hiç kanıt yok
    "partial", // Bazı kanıtlar var, eksik
    "verified", // Yeterli kanıt ve hukuk taraflandırması
    "strong", // Delil + içtihat + karşı argüman cevabı
  ]).default("unverified"),

  // Eksik ne?
  gaps: z.array(z.string()).default([]), // ["Bilirkişi raporu lazım", "AİHM kararı bulunamadı"]
  notes: z.string().optional(),
});

export type LegalClaim = z.infer<typeof LegalClaimSchema>;

/** Hukukî mesele ağacında bir düğüm */
export const IssueNodeSchema = z.object({
  id: z.string(),
  title: z.string(), // "Görev ve Yetki", "Maddi Hak", vb.
  description: z.string().optional(),
  parentId: z.string().optional(), // Ağaç yapısı: alt-mesele
  claims: z.array(LegalClaimSchema).default([]), // Bu meselenin iddialaları
  priority: z.number().min(1).max(10).default(5),
  isBlocking: z.boolean().default(false), // Karar verilmeden bu çözülmezse dava kaybedilir
});

export type IssueNode = z.infer<typeof IssueNodeSchema>;

/** Çelişki: iki iddia veya belge arasında tutarsızlık */
export const ConflictRecordSchema = z.object({
  id: z.string(),
  description: z.string(), // "Olayın tarihi belgede 12 Mart, diğerinde 15 Mart"
  severity: z.enum(["low", "medium", "high", "critical"]),
  claims: z.array(z.string()), // İlgili iddia ID'leri
  evidences: z.array(z.string()), // İlgili belge ID'leri
  resolution: z.string().optional(), // "Kullanıcıya soruldu ve seçim yapıldı"
  resolvedBy: z.enum(["user", "ai_logic", "unresolved"]).default("unresolved"),
});

export type ConflictRecord = z.infer<typeof ConflictRecordSchema>;

/** Dilekçe paragrafının kalite raporu (ayrıntılı) */
export const ParagraphQualitySchema = z.object({
  index: z.number(),
  text: z.string(),
  category: z.enum(["required", "nuanced", "filler"]),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  
  // Yapılandırılmış kalite ölçütleri
  metrics: z.object({
    factualAccuracy: z.number().min(0).max(10), // Olay doğruluğu
    legalCorrectness: z.number().min(0).max(10), // Hukuk doğruluğu
    evidenceSupport: z.number().min(0).max(10), // Delil desteği
    citationQuality: z.number().min(0).max(10), // İçtihat atıfı kalitesi
    argumentStrength: z.number().min(0).max(10), // İkna gücü
    counterargumentRobustness: z.number().min(0).max(10), // Karşı argümana dayanıklılık
  }).optional(),

  // İddia-delil eşlemesi
  claimsInParagraph: z.array(z.string()).default([]), // Referans iddia ID'leri
  
  // Uyarılar
  warnings: z.array(z.string()).default([]), // ["Delilsiz iddia", "Atıf doğrulanmadı"]
  suggestions: z.array(z.string()).default([]), // ["Şu belgeyi ekle", "Şu kararı atıf yap"]
});

export type ParagraphQuality = z.infer<typeof ParagraphQualitySchema>;

/** Kalite kapısı nihai kararı */
export const DeliveryGateSchema = z.object({
  status: z.enum([
    "approved", // Teslim edilebilir
    "requires_review", // Avukat incelemesi zorunlu
    "blocked", // Kullanıcıdan seçim lazım
    "rejected", // Yeniden yazılması lazım
  ]),
  reason: z.string(),
  
  // Kritik sorunlar
  criticalIssues: z.array(z.object({
    type: z.enum(["false_citation", "unsupported_claim", "legal_error", "procedural_risk", "conflict_unresolved"]),
    description: z.string(),
    location: z.string().optional(), // "Paragraf 5"
  })).default([]),

  // Uyarılar (çalıştırılabilir ama riski var)
  warnings: z.array(z.object({
    type: z.enum(["weak_evidence", "conflicting_case_law", "ambiguous_fact"]),
    description: z.string(),
  })).default([]),

  // Yapılandırma
  overrideToken: z.string().optional(), // "Yine de ver" dedi diye → token tutulur
  reviewedBy: z.string().optional(), // Hangi ajan
  timestamp: z.string(),
});

export type DeliveryGate = z.infer<typeof DeliveryGateSchema>;

/** Dilekçenin analitik matris (görünmez, iç metadata) */
export const PetitionAnalysisMatrixSchema = z.object({
  petitionVersion: z.number(),
  generatedAt: z.string(),
  
  // Yapı
  issueTree: z.array(IssueNodeSchema),
  claims: z.array(LegalClaimSchema),
  conflicts: z.array(ConflictRecordSchema),
  
  // Kalite
  paragraphScores: z.array(ParagraphQualitySchema),
  overallQuality: z.object({
    score: z.number().min(0).max(100),
    factualAccuracy: z.number().min(0).max(1),
    legalCorrectness: z.number().min(0).max(1),
    evidenceCompleteness: z.number().min(0).max(1),
    persuasivenessScore: z.number().min(0).max(1),
  }),
  
  // Teslim karar
  deliveryGate: DeliveryGateSchema,
  
  // Gözlemler
  observations: z.array(z.string()).optional(),
});

export type PetitionAnalysisMatrix = z.infer<typeof PetitionAnalysisMatrixSchema>;

/** Revizyon geçmişi (her döngü) */
export const RevisionLogSchema = z.object({
  iteration: z.number(), // 1, 2, 3, ...
  timestamp: z.string(),
  trigger: z.enum([
    "quality_gate_failed",
    "citation_unverified",
    "conflict_detected",
    "user_feedback",
    "red_team_critique",
  ]),
  changes: z.array(z.object({
    paragraphIndex: z.number(),
    before: z.string(),
    after: z.string(),
    reason: z.string(),
  })).default([]),
  qualityBeforeRevision: z.number(),
  qualityAfterRevision: z.number(),
});

export type RevisionLog = z.infer<typeof RevisionLogSchema>;

// ─────────────────────────────────────────────────────
// Doğrulama ve yardımcılar
// ─────────────────────────────────────────────────────

export function validateClaim(claim: LegalClaim): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!claim.claimText.trim()) errors.push("İddia metni boş");
  if (claim.evidence.length === 0) warnings.push("Delil yok");
  if (claim.legalBases.length === 0) warnings.push("Hukuk dayanağı yok");
  if (claim.status === "unverified" && claim.confidenceScore < 0.3) {
    errors.push("Doğrulanmamış ve düşük güven: teslime uygun değil");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function claimConfidenceScore(claim: LegalClaim): number {
  let score = 0;
  if (claim.evidence.length > 0) score += 0.3;
  if (claim.legalBases.filter(lb => lb.isConfirmed).length > 0) score += 0.3;
  if (claim.citations.filter(c => c.isFound).length > 0) score += 0.2;
  if (!claim.counterArgument) score += 0.1; // Karşı argüman olmayan iddia daha zayıf
  if (claim.ourRebuttal) score += 0.1;
  return Math.min(1, score);
}

export function petitionReadiness(matrix: PetitionAnalysisMatrix): {
  canDeliver: boolean;
  mustReview: boolean;
  reason: string;
} {
  const gate = matrix.deliveryGate;
  const criticalCount = gate.criticalIssues.length;

  if (gate.status === "approved" && criticalCount === 0) {
    return { canDeliver: true, mustReview: false, reason: "Hazır." };
  }
  if (gate.status === "requires_review" || criticalCount > 0) {
    return { canDeliver: false, mustReview: true, reason: gate.reason };
  }
  if (gate.status === "blocked" || gate.status === "rejected") {
    return { canDeliver: false, mustReview: false, reason: gate.reason };
  }
  return { canDeliver: true, mustReview: true, reason: "Uyarılar var; inceleme önerilir." };
}
