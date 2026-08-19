# Faz 13.6 — Per-Workspace Vector RAG + Ethical Walls ✅

**Durum: TAMAM** — TypeScript temiz, Next build başarılı, production'a hazır.

## Ne Eklendi?

### 🎯 Vizyon
Harvey ve CoCounsel'de gördüğümüz iki kritik özelliği HARIS'e ekledik:

1. **Per-Workspace Vector RAG** — Her dava kendi vektör namespace'ine sahip. Semantic search 2 katmanlı: (1) matter documents, (2) global mevzuat/içtihat.
2. **Ethical Walls (Conflict Check)** — Yeni müvekkil/karşı taraf eklerken otomatik çıkar çatışması kontrolü. Kırmızı banner + onay dialog (baro etik).

## Yeni Dosyalar

### Database (Migration 0012 + 0013)
- `supabase/migrations/0012_workspace_vectors.sql`
  - `workspace_document_chunks` tablosu (embedding vector(1536), HNSW index, RLS)
  - RPC: `search_workspace_chunks` (matter-scoped), `search_global_law` (global)
  - View: `workspace_rag_stats`
- `supabase/migrations/0013_conflict_check.sql`
  - `workspace_parties` tablosu (müvekkil/karşı taraf/tanık/bilirkişi, RLS)
  - `conflict_overrides` tablosu (baro denetim log)
  - RPC: `check_conflict`, fonksiyon: `normalize_party_name` (TR karakter)
  - Trigger: `trg_parties_normalize` (auto-normalize)

### RAG Engine
- `src/lib/v2/rag/types.ts` — Chunk, MatterChunkHit, GlobalLawHit, RetrievalResult
- `src/lib/v2/rag/chunker.ts` — Türkçe hukuki metin semantic chunker (~500 token, madde/bölüm tespit)
- `src/lib/v2/rag/embedder.ts` — OpenAI text-embedding-3-large batch (100/req), retry
- `src/lib/v2/rag/indexer.ts` — Belge → chunk → embed → DB, dedup, cost tracking
- `src/lib/v2/rag/retriever.ts` — Dual search (matter + global paralel), prompt formatter

### Conflict Check
- `src/lib/v2/conflict/db.ts` — parties CRUD, conflict check, override log
- `src/app/api/v2/workspaces/[id]/parties/route.ts` — GET/POST/DELETE
- `src/app/api/v2/conflict-check/route.ts` — POST (check), PUT (override log)

### UI
- `src/components/v2/conflict/conflict-banner.tsx` — Kırmızı/sarı severity banner + justification
- `src/components/v2/parties/parties-panel.tsx` — Party CRUD + auto conflict check

## Güncellenen Dosyalar

- `src/app/api/v2/workspaces/[id]/documents/route.ts`
  - Belge yüklenince `indexDocument()` otomatik çağırılıyor (auto RAG index)
- `src/app/api/v2/workspaces/[id]/chat/route.ts`
  - Her chat sorgusunda paralel `retrieve()` çalışıyor, matter + global chunks prompt'a inject
- `src/components/v2/chat/orchestrator-chat.tsx`
  - Sağ panelde MemoryPanel + PartiesPanel yan yana

## Kurulum

### 1. Migration'ları Çalıştır (Supabase SQL Editor)
Sırayla:
```sql
-- 0012_workspace_vectors.sql tamamını yapıştır → Run
-- 0013_conflict_check.sql tamamını yapıştır → Run
```
**Beklenen:** `Success. No rows returned` ✅

### 2. Kodu Push Et
```powershell
cd C:\AI\haris-app
git add .
git commit -m "Faz 13.6: Per-workspace vector RAG + Ethical Walls (Conflict Check)"
git push origin main
```

### 3. Env Variable (Zaten var, doğrulama)
```
HARIS_EMBEDDING_MODEL=openai:text-embedding-3-large
```

### 4. Deploy
Vercel otomatik build alır (~3 dk).

## Test Senaryoları

### Test 1 — Conflict Check
1. Yeni matter #1 aç: müvekkil = "Ali Veli"
2. Yeni matter #2 aç, sağ panelde **Taraflar → + Taraf Ekle**
3. Rol: **Karşı Taraf**, isim: "Ali Veli"
4. **Ekle** → 🔴 Kırmızı banner: "Bu kişi Matter #1'de MÜVEKKİL olarak zaten var"
5. Gerekçe yaz (min 20 karakter) → **Anladım, Devam Et**
6. Supabase → `conflict_overrides` tablosunda kayıt oluşmalı

### Test 2 — RAG İndexing
1. Bir matter'a PDF yükle (ör. karşı taraf ihtarnamesi)
2. Vercel/Supabase log'da: `[RAG index] xxx.pdf: N chunk · X tok · $Y`
3. Supabase Table Editor → `workspace_document_chunks` → satırlar görünmeli

### Test 3 — Semantic Search (Chat)
1. Chat'e sor: "Karşı tarafın en zayıf argümanı ne?"
2. Yanıtta belgeden **spesifik alıntı** olmalı (sayfa/paragraf)
3. Kod tarafında chat route.ts'de `ragResult.matter.length > 0` olacak

### Test 4 — Global Law Fallback
1. Chat'e sor: "TBK 49 tazminat şartları ne?"
2. Yanıt `search_global_law` üzerinden mevzuat içtihattan çekilecek
3. Rag block'ta "MEVZUAT & İÇTİHAT" bölümü görünmeli

## Bilinen Limitasyonlar

1. **Demo mod RAG yok** — `isDemoMode` durumunda indexer/retriever no-op.
2. **Global RAG boş olabilir** — `rag_documents` tablosunda mevzuat/içtihat corpus'ü yüklü değilse `search_global_law` boş döner. `scripts/index-corpus.ts` mevcut ama corpus'e ihtiyaç var.
3. **Fuzzy match sadece exact_name + tc_match** — pg_trgm ile ileride fuzzy improve edilebilir.
4. **Chunk-level citation UI yok** — Şu an prompt'a inject ediliyor ama UI'da kaynak chip'i yok. Gelecek fazda.

## Maliyet Notları

- Embedding maliyeti: **$0.13 / 1M token** (text-embedding-3-large)
- Ortalama 100 sayfa PDF ≈ 30k token ≈ **$0.004** (yaklaşık 15 kuruş)
- 1000 belge yükleyen kullanıcı ≈ **$4** embed maliyeti
- Chat sırasında her sorguda 1x embed (query) ≈ **$0.00001** (ihmal edilir)

## Sonraki Fazlar (Öneri)

- **Faz 13.7**: Chunk-level citation UI (dilekçede footnote gibi kaynak referansları)
- **Faz 13.8**: Global corpus indexing script (Yargıtay + Mevzuat toplu import)
- **Faz 13.9**: pg_trgm fuzzy match + phonetic (Turkish soundex)
- **Faz 14**: Advanced Analytics — orkestra maliyet dashboard, ajan performans metrik
