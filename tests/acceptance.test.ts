import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compareDrafts,
  describeDraftLoss,
  parseFallbackModel,
  summarizeFindings,
} from "../src/lib/v2/orchestra/draft-guard.ts";

const baseDraft = `# ASLİYE HUKUK MAHKEMESİNE

AÇIKLAMALAR
1. Davalı, 150.000,00 TL tutarındaki kira bedelini ödememiştir.
2. Müvekkil kusurlu değildir.
3. Fazlaya ilişkin haklarımız saklı kalmak kaydıyla talepte bulunuyoruz.

NETİCE-İ TALEP
1. 150.000,00 TL alacağın temerrüt tarihinden itibaren faiziyle tahsiline,
2. Yargılama giderleri ve vekalet ücretinin davalıya yükletilmesine,
karar verilmesini saygılarımızla arz ederiz.`;

test("1. Aynı taslak kayıp üretmez", () => {
  assert.equal(compareDrafts(baseDraft, baseDraft).hasLoss, false);
});

test("2. Silinen tutar yakalanır", () => {
  const revised = baseDraft.replaceAll("150.000,00 TL", "bir miktar");
  const report = compareDrafts(baseDraft, revised);
  assert.ok(report.missingAmounts.includes("150.000,00TL"));
});

test("3. Silinen talep yakalanır", () => {
  const revised = baseDraft.replace("2. Yargılama giderleri ve vekalet ücretinin davalıya yükletilmesine,\n", "");
  const report = compareDrafts(baseDraft, revised);
  assert.equal(report.missingRequests.length, 1);
});

test("4. Silinen 'saklı kalmak' çekincesi yakalanır", () => {
  const revised = baseDraft.replace("Fazlaya ilişkin haklarımız saklı kalmak kaydıyla talepte", "Talepte");
  assert.ok(compareDrafts(baseDraft, revised).missingReservations.length > 0);
});

test("5. 'değil' ifadesinin tersine çevrilmesi yakalanır", () => {
  const revised = baseDraft.replace("Müvekkil kusurlu değildir.", "Müvekkil kusurludur.");
  assert.ok(compareDrafts(baseDraft, revised).missingNegations.length > 0);
});

test("6. Sadece üslup değişikliği kayıp sayılmaz", () => {
  const revised = baseDraft.replace("ödememiştir", "hiçbir şekilde ödememiştir");
  assert.equal(compareDrafts(baseDraft, revised).hasLoss, false);
});

test("7. Kayıp açıklamaları okunabilir metin üretir", () => {
  const revised = baseDraft.replaceAll("150.000,00 TL", "");
  const messages = describeDraftLoss(compareDrafts(baseDraft, revised));
  assert.ok(messages.some((m) => m.startsWith("Revizyonda tutar kayboldu")));
});

test("8. Bulgu etiketleri türlerine göre sayılır", () => {
  const text = "[BELGE:kira.pdf, s.2] kira 5.000 TL. [TARAF İDDİASI] ödeme yapıldı. [ÇIKARIM] temerrüt var. [DOĞRULANMADI] ihtar tarihi.";
  const summary = summarizeFindings(text);
  assert.equal(summary.counts["BELGE"], 1);
  assert.equal(summary.counts["TARAF İDDİASI"], 1);
  assert.equal(summary.counts["DOĞRULANMADI"], 1);
  assert.equal(summary.total, 4);
});

test("9. Kaynaksız BELGE etiketi ayrıca işaretlenir", () => {
  assert.equal(summarizeFindings("[BELGE] sözleşme var").documentsWithoutSource, 1);
});

test("10. Yedek model ayarı doğru okunur", () => {
  assert.deepEqual(parseFallbackModel("openai:gpt-5-mini"), { provider: "openai", modelId: "gpt-5-mini" });
  assert.deepEqual(parseFallbackModel("claude-sonnet-4-5"), { provider: "anthropic", modelId: "claude-sonnet-4-5" });
  assert.equal(parseFallbackModel(""), null);
});
