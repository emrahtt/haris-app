# Faz 13.7 — Citation UI + ESLint Cleanup + Global Corpus Seed ✅

**Durum: TAMAM** — TypeScript temiz, production'a hazır.

## Ne Eklendi?

### 🎯 1. Citation UI (Harvey/CoCounsel Pattern)
Chat mesajı altında AI'ın kullandığı kaynaklar **tıklanabilir chip'ler** olarak görünüyor:

- 📄 **Matter chips** (altın) — dava belgelerinden alıntı, sayfa/bölüm bilgisi
- **Global chips** (kategoriye göre renkli):
  - 🟠 Yargıtay (amber)
  - 🟠 Danıştay (orange)
  - 🔴 AYM (red)
  - 🔵 AİHM (blue)
  - 🟢 Mevzuat (emerald)
  - 🟣 Doktrin (violet)
- Her chip'e tıklayınca **200 karakter snippet** açılıyor
- Global chips'te varsa **🔗 Kaynak** butonu (URL'e link)
- Benzerlik yüzdesi tooltip'te

### 🧹 2. ESLint Cleanup (Sarı Uyarı Temizliği)
Vercel build log'undaki 15+ sarı uyarı temizlendi:

- ✅ `Scale`, `ArrowRight`, `Shield`, `AgentId`, `COURTS`, `router`, `currentText` unused import/var
- ✅ `PdfLibDocument`, `CHUNK_THRESHOLD_BYTES`, `PAGES_PER_CHUNK` prefix'lendi
- ✅ `DEMO_USER`, `chunkStats`, `KEEP_RECENT_MESSAGES`, `escaped` temizlendi
- ✅ `deleteDocumentChunks`, `pendingSubmit` (Faz 13.6 kalıntısı) kaldırıldı

**Sonuç:** Vercel build log'u artık çok daha temiz.

### 🌱 3. Global Corpus Seed Script
`scripts/seed-global-corpus.ts` — 27 örnek kayıt:
- **17 Mevzuat**: TBK, TMK, TTK, HMK, İş K., TCK, KTK maddeleri
- **10 İçtihat**: Yargıtay HGK/2/4/9/11 Daire + Danıştay + AYM

Kullanım:
```bash
npx tsx scripts/seed-global-corpus.ts
```

Bu script çalıştırıldıktan sonra `search_global_law` RPC'si somut sonuçlar döner ve chat citations'da "🟢 Mevzuat" chip'leri belirir.

## Yeni Dosyalar

- `src/components/v2/chat/citations-view.tsx` — Citation chips UI
- `scripts/seed-global-corpus.ts` — Global corpus başlangıç verisi

## Güncellenen Dosyalar

- `src/app/api/v2/workspaces/[id]/chat/route.ts` — Response'a citations objesi eklendi
- `src/components/v2/chat/orchestrator-chat.tsx` — ChatMessage interface + CitationsView render
- `src/app/v2/workspaces/[id]/workspace-client.tsx` — ChatMessage state citations bind
- 9 farklı dosyada unused import/var temizliği

## Kurulum

### 1. Dosyaları kopyala
ZIP'i local'e overwrite ile aç.

### 2. Global corpus seed et (opsiyonel ama önerilen)
```powershell
cd C:\AI\haris-app
npx tsx scripts/seed-global-corpus.ts
```

**Beklenen çıktı:**
```
🌱 27 kayıt seed ediliyor...
✅ mevzuat-tbk-49 — TBK m.49 — Haksız Fiil Sorumluluğu
✅ mevzuat-tbk-51 — TBK m.51 — Tazminatın Belirlenmesi
...
🎉 Bitti. Başarılı: 27 · Başarısız: 0
```

Maliyet: ~$0.001 (27 × ~500 token embed)

### 3. Push
```powershell
git add .
git commit -m "Faz 13.7: Citation UI + ESLint cleanup + Global corpus seed"
git push origin main
```

## Test Senaryosu

1. **Belge yükle** — bir dava PDF'i (RAG index otomatik olur)
2. **Chat'e sor**: "TBK 49'a göre haksız fiil şartları ne?"
3. **Yanıtın altında**:
   - 🟢 Mevzuat chip: "TBK m.49 — Haksız Fiil Sorumluluğu"
   - 📄 Matter chip: "senin-dava-dosyan.pdf · s.3"
4. **Chip'e tıkla** → 200 karakter snippet açılır
5. **🔗 Kaynak** → mevzuat.gov.tr'ye yönlendirir (varsa)

## Sonraki Fazlar (Öneri)

- **Faz 13.8**: Chunk-level inline citations (yanıt metninde [1], [2] footnote'lar)
- **Faz 13.9**: pg_trgm fuzzy match (yazım hatalarına toleranslı conflict check)
- **Faz 14**: Analytics Dashboard — ajan performans, cost breakdown, cache hit rate grafikler
- **Faz 15**: Multi-tenant billing (kullanıcı başına AI kredi kotası)
