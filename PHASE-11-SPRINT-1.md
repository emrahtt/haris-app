# 📋 Faz 11 Sprint 11.1 — Matter Workspace Foundation

**Durum:** ✅ Tamam
**Tarih:** 2026-06-15
**Süre:** 1 oturum
**Vizyon:** Harvey/CoCounsel/Legora benzeri 3-panel Matter Workspace mimarisinin iskeleti

---

## 🎯 Sprint 11.1 Hedefi

Mevcut "AI butona basınca üretir" modelini bozmadan, paralel `/v2/` route'unda **3-panel Matter Workspace** iskeletini kurmak. Sonraki sprint'ler için sağlam temel.

---

## ✅ Yapılanlar

### 1. Model Strategy & Providers (`src/lib/v2/providers/`)
- 5 rol bazlı model registry (orchestrator, analyzer, drafter, quick, vision)
- `getChatModel(role)` factory — LangChain ChatAnthropic / ChatOpenAI döner
- `isDemoMode()` — API key yoksa mock fallback
- OneProvider proxy desteği (ANTHROPIC_BASE_URL)
- **Modeller (kullanıcı onaylı premium mix):**
  - Orchestrator: Claude Opus 4.6 ($15/$75) — BigLaw Bench %90.2
  - Analyzer (×7 paralel): Claude Sonnet 4.5 ($3/$15)
  - Drafter: GPT-5.4 Thinking ($1.25/$10, 256K context)
  - Quick/Editor: GPT-5.4-mini ($0.15/$0.60)
  - Vision (OCR): GPT-4o

### 2. 12 Uzman Ajan (`src/lib/v2/orchestra/agents.ts`)
| # | Ajan | Model | Görev |
|---|---|---|---|
| 1 | 🎼 Orkestra Şefi | Opus 4.6 | Planlama, koordinasyon, sentez |
| 2 | 📥 Vaka Alıcısı | GPT-5.4-mini | Belge sınıflama (12 kategori) |
| 3 | ⚖️ Maddi Hukuk | Sonnet 4.5 | TBK/TMK/TTK/KTK/İK |
| 4 | 📜 Usul Hukuku | Sonnet 4.5 | HMK/CMK/İYUK, süreler |
| 5 | 🔍 İçtihat Tarama | Sonnet 4.5 | Yargıtay/Danıştay/AYM (Bedesten) |
| 6 | 🛡️ Karşı Argüman | Sonnet 4.5 | Red-Team, zayıflık tespiti |
| 7 | 🧪 Bilirkişi Analisti | Sonnet 4.5 | Rapor analizi (opsiyonel) |
| 8 | 🗂️ Delil Haritalayıcı | GPT-5.4-mini | Tabular review |
| 9 | 💬 Müvekkil İletişim | GPT-5.4-mini | Sade dil özet |
| 10 | ✍️ Dilekçe Editörü | GPT-5.4 | Tam dilekçe yazımı |
| 11 | ✅ Kalite Kontrol | Sonnet 4.5 | Paragraf puanlama (gerekli/nüans/doldurma) |
| 12 | 📚 Atıf Doğrulayıcı | GPT-5.4-mini | Halüsinasyon tespiti (Bedesten cross-check) |

Her ajan: emoji, displayName, shortName, capabilities (chip), description (tooltip), systemPrompt (TR, hukuki), enabledByDefault flag.

### 3. LangGraph State Schema (`src/lib/v2/state/workspace-state.ts`)
- `WorkspaceAnnotation` (Annotation.Root)
- Reducer fonksiyonlu typed state:
  - `documents[]`, `agentOutputs[]`, `agentMessages[]`, `conflicts[]`, `checkpoints[]`
  - Reducer'lar idempotent merge (agent-round key, checkpoint id, vb.)
- Sprint 11.3'te bu state üzerinde `StateGraph` çalıştırılacak

### 4. Supabase Migration 0007
6 yeni tablo + 1 view + 1 trigger + 6 RLS policy:
- `workspaces` (preferences jsonb, orchestration_status, total_cost_usd)
- `workspace_documents` (Vault — category, summary, parties, extracted_text)
- `agent_runs` (model + raw_response + system_prompt — UI'da "ham yanıt" için)
- `agent_messages` (iç diyaloglar — şef-ajan, ajan-ajan)
- `petition_versions` (Tiptap history + quality_report jsonb)
- `user_preferences` (slider/toggle/mode tercihleri)
- `workspace_summary` view (security_invoker)
- `on_auth_user_created_preferences` trigger

### 5. UI İskelet (3-Panel Matter Workspace)
- `/v2` — Workspace listesi + yeni Matter CTA
- `/v2/workspaces/new` — Drag-drop onboarding (Karar 1: en az 1 belge zorunlu)
- `/v2/workspaces/[id]` — 3-panel ana ekran

**Bileşenler:**
- `ThreePanelLayout` — sol/orta/sağ panel, her biri daraltılabilir, sticky workflow viewer (Karar 3)
- `VaultPanel` — kategoriye göre gruplu belge listesi, status badge'leri
- `WorkflowViewer` — 3 tur × node grid, çalışan ajanlar pulse, checkpoint'ler amber
- `OrchestratorChat` — @mention dropdown + ⓘ tooltip + 📖 Örnekler modal (Karar 5) + ham yanıt toggle (Karar 8)
- `PetitionCanvas` — markdown önizleme (Sprint 11.5'te Tiptap)
- **İç Diyalog Dock** — sol alt, toggle (Karar 9 — "şef-ajan konuşmalarını görmek istersem")

---

## 🧪 Test Sonuçları

| Test | Sonuç |
|---|---|
| `npx tsc --noEmit` | ✅ 0 hata |
| `npx next lint` | ✅ exit 0 (sadece eski koddaki warnings) |
| `npx next build` | ✅ 46 sayfa, 33s |
| `npm audit --omit=dev` | ✅ 11 vuln (5 low + 6 moderate), 0 critical/high |
| `curl /v2` | ✅ HTTP 200, 16.5KB |
| `curl /v2/workspaces/new` | ✅ HTTP 200, 14.6KB |
| `curl /v2/workspaces/demo-1` | ✅ HTTP 200, 21.3KB |
| Regression: eski sayfalar | ✅ /, /login, /pricing, /dashboard, /admin, /legal/* hepsi çalışıyor |

---

## ⚠️ Kullanıcının Yapması Gerekenler

### 1. Supabase Migration 0007'yi Çalıştır
**Supabase Dashboard** → SQL Editor → New Query → `supabase/migrations/0007_matter_workspace.sql` içeriğini yapıştır → Run.

### 2. Önce Mevcut Migration Durumunu Bildir
Henüz hangi migration'ların prod'da çalıştığını bilmiyorum. Supabase SQL Editor'da şunu çalıştır:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
ORDER BY table_name;
```
Sonucu paylaş → eksik migration'ları sırayla deploy ederiz.

### 3. Vercel Env Variables Güncelle
Vercel Dashboard → Project Settings → Environment Variables:
- `HARIS_ORCHESTRATOR_MODEL` = `anthropic:claude-4-6-opus`
- `HARIS_ANALYZER_MODEL` = `anthropic:claude-4-6-sonnet`
- `HARIS_DRAFTER_MODEL` = `openai:gpt-5.4`
- `HARIS_QUICK_MODEL` = `openai:gpt-5.4-mini`
- `HARIS_VISION_MODEL` = `openai:gpt-4o`

---

## 📦 Sprint 11.1 Çıktıları

- **Yeni dosyalar:** 13 (3 lib + 5 component + 5 app route + 1 migration)
- **Yeni dependency:** 4 (@langchain/{langgraph,core,anthropic,openai})
- **Yeni Supabase tablo:** 6 + 1 view + 1 trigger
- **Yeni env değişkeni:** 6 (HARIS_*_MODEL)
- **Yeni UI sayfa:** 3 (/v2, /v2/workspaces/new, /v2/workspaces/[id])

---

## ⏭️ Sırada — Sprint 11.2 (Vault + OCR Pipeline)

- Drag-drop upload → Supabase Storage bucket
- Paralel OCR (GPT-4o Vision) — birden fazla belge eş zamanlı
- Vaka Alıcısı ajanı (Intake) → her belge için JSON sınıflama
- Vault panelinde live status update
- Workspace API: `POST /api/v2/workspaces`, `POST /api/v2/workspaces/[id]/documents`
- ~~Tabular Review~~ → **Faz 12'ye ertelendi** (kullanıcı kararı)

Tahmini süre: 4-5 gün (kullanıcı testiyle birlikte)
