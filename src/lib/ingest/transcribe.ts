/**
 * Ses Transkripsiyonu — OpenAI Whisper
 *
 * - Gerçek: OpenAI Whisper API (whisper-1)
 *   - Türkçe destekli
 *   - Maks dosya: 25 MB, ~30 dk ses
 *   - Maliyet: $0.006 / dakika
 *
 * - Demo: Bağlama göre uydurma transkript
 */

import OpenAI from "openai";
import { hasOpenAI, isAiDemoMode, aiConfig } from "@/lib/ai/config";

interface TranscriptResult {
  text: string;
  method: "whisper-1" | "demo";
  confidence: "high" | "medium" | "low";
  durationSec?: number;
  warnings: string[];
}

async function transcribeWithWhisper(
  audioBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<TranscriptResult> {
  try {
    const client = new OpenAI({ apiKey: aiConfig.openaiKey });

    // OpenAI SDK File API kullanır
    // Buffer → Uint8Array (Node 22 tip uyumluluğu için)
    const uint8 = new Uint8Array(audioBuffer);
    const file = new File([uint8], fileName, { type: mimeType });

    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "tr", // Türkçe
      response_format: "verbose_json",
    });

    return {
      text: transcription.text || "",
      method: "whisper-1",
      confidence: "high",
      durationSec: transcription.duration,
      warnings: [],
    };
  } catch (err) {
    return {
      text: "",
      method: "whisper-1",
      confidence: "low",
      warnings: [
        `Whisper hatası: ${err instanceof Error ? err.message : "bilinmeyen"}`,
      ],
    };
  }
}

function transcribeDemo(fileName: string, sizeBytes: number): TranscriptResult {
  const lower = fileName.toLowerCase();
  const estimatedSec = Math.round(sizeBytes / 16000);
  const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);

  let text = "";

  if (lower.includes("tanik") || lower.includes("ifade") || lower.includes("sahit")) {
    text = `# TANIK İFADE TRANSKRİPTİ (Demo)

[00:00] **Tanık:** "Adım Bilal Korkmaz, 35 yaşındayım, kuyumcuyum."

[00:05] **Tanık:** "12 Mart 2024 sabahı yaklaşık saat sekiz buçuk gibi Barbaros Bulvarı'nda yürüyordum. Önce bir gürültü duydum, döndüğümde kırmızı ışıkta kavşağa giren bir aracın diğer araca çarptığını gördüm."

[00:25] **Sorgu:** "Trafik ışığını net olarak gördünüz mü?"

[00:28] **Tanık:** "Evet, ışık kesinlikle kırmızıydı. Hatta diğer yönden gelen araçlar yeşil ışıkta hareket etmek üzereydi."

[00:38] **Tanık:** "Olay yerinde durdum, hemen polis çağırdım. Mağdur araçtan çıkamıyordu, ambulans gelene kadar yanında bekledim."

[01:05] **Sorgu:** "Kazaya neden olan sürücüyü tanıdınız mı?"

[01:08] **Tanık:** "Hayır, daha önce hiç görmemiştim."

---
*[Demo transkript — gerçek Whisper API için OPENAI_API_KEY ekleyin. Dosya: ${fileName} / ${sizeMB} MB / ~${estimatedSec}s]*`;
  } else {
    text = `# Ses Transkripti (Demo)

[OpenAI Whisper API entegrasyonu hazır, ancak demo modunda çalışıyor]

**Dosya bilgileri:**
- Ad: ${fileName}
- Boyut: ${sizeMB} MB
- Tahmini süre: ${estimatedSec} saniye (${(estimatedSec / 60).toFixed(1)} dakika)

**GERÇEK TRANSKRİPSİYON İÇİN:**
\`\`\`
.env.local
OPENAI_API_KEY=sk-...
\`\`\`

Whisper özellikleri:
- Türkçe akıcı transkripsiyon
- Konuşmacı tonlama hassasiyeti
- Maks 25 MB / ~30 dk ses
- Maliyet: $0.006 / dakika (≈ ₺0.20)

---
*[Şu an dosya saklandı ama transkripsiyon yapılmadı.]*`;
  }

  return {
    text,
    method: "demo",
    confidence: "low",
    durationSec: estimatedSec,
    warnings: ["Whisper demo modunda — gerçek transkripsiyon için OPENAI_API_KEY gerekli"],
  };
}

export async function performTranscription(
  audioBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<TranscriptResult> {
  // Whisper sadece OpenAI'da
  if (!isAiDemoMode && hasOpenAI) {
    // Max 25 MB
    if (audioBuffer.length > 25 * 1024 * 1024) {
      return {
        text: "",
        method: "whisper-1",
        confidence: "low",
        warnings: ["Ses dosyası 25 MB'ı aşıyor — Whisper limiti"],
      };
    }
    try {
      const result = await transcribeWithWhisper(audioBuffer, fileName, mimeType);
      if (result.text.length > 0) return result;
    } catch (err) {
      console.warn("[transcribe] Whisper başarısız, demo'ya fallback:", err);
    }
  }
  return transcribeDemo(fileName, audioBuffer.length);
}
