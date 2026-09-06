# Faz 13.6 — Per-Workspace Vector RAG + Ethical Walls

## Vizyon
Harvey ve CoCounsel'de gördüğümüz iki kritik özelliği HARIS'e ekliyoruz:

1. **Per-Workspace Vector RAG** — Her dava kendi vektör namespace'ine sahip. Semantic search 2 katmanlı: (1) matter documents, (2) global mevzuat/içtihat.
2. **Ethical Walls (Conflict Check)** — Yeni dava açarken müvekkil/karşı taraf ismini otomatik kontrol et. Çıkar çatışması varsa **kırmızı banner + onay dialog** (baro etik kuralları gereği).

## Kullanıcı Kararları
- **Conflict Strictness:** UYAR + Onaylat (Harvey pattern)
- **RAG Kapsam:** Matter + Global paralel (en güçlüsü)

## Sprint Durumu

| # | Sprint | Durum | Süre |
|---|--------|-------|------|
| 1 | Migration 0012: workspace vectors | ✅ Hazır | 30 dk |
| 2 | Migration 0013: parties + conflict | ✅ Hazır | 30 dk |
| 3 | RAG engine: chunker + embedder + retrieval | ⏳ Sonraki | 90 dk |
| 4 | UI: Conflict banner + matter creation guard | ⏳ Sonraki | 90 dk |

## Migration 0012: workspace_vectors

### Yeni Tablo
- **workspace_document_chunks** — Her belge küçük parçalara bölünüp embed edilir
  - `workspace_id` (izolasyon anahtarı)
  - `document_id`, `chunk_index`
  - `content`, `content_hash` (SHA256 dedup)
  - `embedding vector(1536)` — text-embedding-3-large
  - `page_number`, `section_title` (referans için)

### Yeni RPC'ler
- **`search_workspace_chunks(workspace_id, query_embedding, match_count, min_similarity)`**
  - Sadece o davanın chunk'larını arar
  - RLS altında çalışır (security invoker)
- **`search_global_law(query_embedding, ...)`**
  - Mevzuat/içtihat aramalarını sarmalayan helper

### View
- **`workspace_rag_stats`** — Workspace başına indexed belge + chunk sayısı

## Migration 0013: conflict_check

### Yeni Tablolar
- **workspace_parties** — Her workspace'in müvekkil/karşı taraf listesi
  - `role` ∈ (müvekkil, karsi_taraf, ilgili_taraf, tanik, bilirkişi)
  - `full_name`, `normalized_name` (fuzzy match için)
  - `tc_no`, `tax_no`, `entity_type` (gerçek/tüzel/kamu)
- **conflict_overrides** — Kullanıcı "anladım, devam et" derse buraya audit log

### Yeni RPC
- **`check_conflict(full_name, tc_no?, exclude_workspace_id?)`**
  - Tüm kullanıcı workspace'lerini tarar
  - Severity: `critical` (karşı taraf çakışması), `warning` (müvekkil çakışması), `info`
  - Match types: `exact_name`, `tc_match`, `fuzzy_name`

### Fonksiyon
- **`normalize_party_name(text)`** — Türkçe karakter + boşluk normalize (Ç→C, İ→I, çift boşluk→tek)

## Sprint 3: RAG Engine (Sonraki)
Planlanan dosyalar:
- `src/lib/v2/rag/chunker.ts` — Semantic chunking (~500 token/chunk, overlap 50)
- `src/lib/v2/rag/embedder.ts` — OpenAI embeddings, batch (100 chunk/req)
- `src/lib/v2/rag/retriever.ts` — Dual search (matter + global) + rerank
- `src/lib/v2/rag/indexer.ts` — Yeni belge yüklenince otomatik index
- Chat/orchestrator entegrasyonu: her sorguda RAG context

## Sprint 4: UI (Sonraki)
Planlanan komponenlerimiz:
- `src/components/v2/conflict/conflict-banner.tsx` — Kırmızı uyarı banner
- `src/components/v2/conflict/conflict-dialog.tsx` — Onay + justification
- `src/components/v2/parties/parties-panel.tsx` — Müvekkil/karşı taraf yönetimi
- Matter creation form güncelleme (parties girişi + auto conflict check)

## Kurulum

### 1. Migration Çalıştır (Supabase Dashboard → SQL Editor)
Sırayla:
```sql
-- 1. 0012_workspace_vectors.sql tamamını yapıştır → Run
-- 2. 0013_conflict_check.sql tamamını yapıştır → Run
```

### 2. Sonraki adımlar
Sprint 3 kod hazırlandığında bildirilecek.

## Test Planı (Sprint 4 sonrası)
1. **Matter #1 oluştur:** Müvekkil="Ali Veli", Karşı taraf="Mehmet Kaya"
2. **Matter #2 oluştur:** Müvekkil="Ayşe Yıldız", Karşı taraf="Ali Veli"
   → 🔴 Kritik uyarı: "Ali Veli daha önce Matter #1'de MÜVEKKİL olarak temsil edildi. Şimdi karşı taraf olarak alıyorsunuz — çıkar çatışması!"
3. **Onay dialog:** Justification gir → conflict_overrides tablosuna log
4. **RAG test:** Matter #1'de "boşanma dilekçesi" ara → sadece #1 belgeleri + global mevzuat, #2 belgeleri asla dönmemeli

## Referanslar
- Harvey Ethical Walls: https://www.harvey.ai/security
- pgvector HNSW: https://github.com/pgvector/pgvector#hnsw
- OpenAI Embeddings v3-large: https://openai.com/index/new-embedding-models-and-api-updates/
