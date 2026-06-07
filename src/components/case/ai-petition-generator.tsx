"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { useCaseContext } from "@/hooks/use-case-context";
import { RagProvenancePanel } from "@/components/rag/rag-provenance";
import { useToast } from "@/components/ui/toast-provider";
import type { LegalCase } from "@/lib/data/types";
import type { AgentId } from "@/lib/ai/prompts";
import {
  Sparkles,
  Flame,
  Eye,
  Shield,
  Brain,
  StopCircle,
  RotateCcw,
  Download,
  Copy,
  Check,
} from "lucide-react";

interface Props {
  caseItem: LegalCase;
}

type Phase = "idle" | "drafting" | "adversarial" | "done";

const TEMPLATES = [
  { id: "cevap-dilekce", label: "Cevaba Cevap Dilekçesi" },
  { id: "islah", label: "Islah Dilekçesi" },
  { id: "beyan", label: "Beyan Dilekçesi" },
  { id: "tanik-listesi", label: "Tanık Listesi Dilekçesi" },
  { id: "bilirkisi-itiraz", label: "Bilirkişi Raporuna İtiraz" },
  { id: "istinaf", label: "İstinaf Dilekçesi" },
  { id: "temyiz", label: "Temyiz Dilekçesi" },
  { id: "aym", label: "AYM Bireysel Başvuru" },
  { id: "aihm", label: "AİHM Başvurusu" },
];

export function AIPetitionGenerator({ caseItem }: Props) {
  const toast = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState("cevap-dilekce");
  const [tone, setTone] = useState("Klasik / Resmi");
  const [length, setLength] = useState("Detaylı (10-15 sayfa)");
  const [useAdversarial, setUseAdversarial] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [copied, setCopied] = useState(false);

  const petition = useAgentStream();
  const adversarial = useAgentStream();

  const { fullContext: baseFullContext, hasDocuments, digest } = useCaseContext(caseItem);

  const caseContext = `${baseFullContext}

**Üretilecek Belge:** ${TEMPLATES.find((t) => t.id === selectedTemplate)?.label}
**İstenen Üslup:** ${tone}
**İstenen Uzunluk:** ${length}`.trim();

  async function handleGenerate() {
    setPhase("drafting");

    try {
      // 1. Aşama: Dilekçeyi yaz
      const petitionText = await petition.run({
        agentId: "petitionWriter",
        context: caseContext,
      });

      if (!petitionText) {
        setPhase("idle");
        return;
      }

      // 2. Aşama: Adversarial (eğer açıksa)
      if (useAdversarial) {
        setPhase("adversarial");
        await adversarial.run({
          agentId: "adversarial",
          context: caseContext,
          targetText: petitionText,
        });
      }

      setPhase("done");
    } catch {
      toast("AI çağrısı başarısız. Demo mod ile devam ediyor.");
      setPhase("idle");
    }
  }

  function handleStop() {
    petition.abort();
    adversarial.abort();
    setPhase("idle");
  }

  function handleReset() {
    petition.reset();
    adversarial.reset();
    setPhase("idle");
  }

  function handleCopy() {
    if (petition.text) {
      navigator.clipboard.writeText(petition.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast("Dilekçe panoya kopyalandı");
    }
  }

  const isRunning = petition.isStreaming || adversarial.isStreaming;

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[280px_1fr_360px] gap-4">
      {/* Sol panel — seçimler */}
      <div className="space-y-3.5">
        <Card>
          <h4 className="text-xs uppercase tracking-[0.1em] text-[var(--color-text-3)] mb-3 px-3">
            Dilekçe Tipi
          </h4>
          {TEMPLATES.map((t) => (
            <div
              key={t.id}
              onClick={() => !isRunning && setSelectedTemplate(t.id)}
              className={`px-3 py-2.5 rounded-md text-[12.5px] cursor-pointer transition-all ${
                selectedTemplate === t.id
                  ? "bg-[var(--color-gold)]/[0.08] text-[var(--color-gold-bright)] border-l-2 border-[var(--color-gold)] pl-2.5"
                  : "text-[var(--color-text-2)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-text)]"
              } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {t.label}
            </div>
          ))}
        </Card>

        <Card>
          <h4 className="text-xs uppercase tracking-[0.1em] text-[var(--color-text-3)] mb-3 px-3">
            AI Ayarları
          </h4>
          <div className="px-3 text-xs text-[var(--color-text-2)] space-y-2.5">
            <div>
              <label className="block mb-1">Üslup</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                disabled={isRunning}
                className="w-full text-xs px-2.5 py-1.5 rounded-md bg-[var(--color-bg-2)] border border-[var(--color-line)] text-[var(--color-text)] outline-none disabled:opacity-50"
              >
                <option>Klasik / Resmi</option>
                <option>Sert / Atak</option>
                <option>Ölçülü / Diplomatik</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">Uzunluk</label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                disabled={isRunning}
                className="w-full text-xs px-2.5 py-1.5 rounded-md bg-[var(--color-bg-2)] border border-[var(--color-line)] text-[var(--color-text)] outline-none disabled:opacity-50"
              >
                <option>Detaylı (10-15 sayfa)</option>
                <option>Standart (5-8 sayfa)</option>
                <option>Özet (2-3 sayfa)</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAdversarial}
                  onChange={(e) => setUseAdversarial(e.target.checked)}
                  disabled={isRunning}
                />
                <span className="flex items-center gap-1">
                  <Flame size={11} className="text-[var(--color-danger)]" /> Karşı Taraf
                  Simülasyonu
                </span>
              </label>
            </div>
          </div>

          {/* Üret butonu */}
          {phase === "idle" && (
            <Button
              variant="primary"
              className="w-full justify-center mt-4"
              onClick={handleGenerate}
            >
              <Sparkles size={14} /> AI ile Üret
            </Button>
          )}

          {isRunning && (
            <Button
              variant="danger"
              className="w-full justify-center mt-4"
              onClick={handleStop}
            >
              <StopCircle size={14} /> Durdur
            </Button>
          )}

          {phase === "done" && !isRunning && (
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" className="flex-1 justify-center" onClick={handleReset}>
                <RotateCcw size={14} /> Sıfırla
              </Button>
              <Button
                variant="primary"
                className="flex-1 justify-center"
                onClick={handleGenerate}
              >
                <Sparkles size={14} /> Yeniden
              </Button>
            </div>
          )}
        </Card>

        {/* Faz göstergesi */}
        {phase !== "idle" && (
          <Card>
            <h4 className="text-xs uppercase tracking-[0.1em] text-[var(--color-text-3)] mb-3 px-3">
              AI Süreç
            </h4>
            <div className="space-y-2 px-3 text-xs">
              <PhaseStep
                active={phase === "drafting"}
                done={phase === "adversarial" || phase === "done"}
                icon={Sparkles}
                label="Dilekçe Yazarı"
                duration={petition.isDone ? `${(petition.duration / 1000).toFixed(1)}s` : ""}
              />
              {useAdversarial && (
                <PhaseStep
                  active={phase === "adversarial"}
                  done={phase === "done"}
                  icon={Flame}
                  label="Karşı Taraf Simülatörü"
                  duration={
                    adversarial.isDone ? `${(adversarial.duration / 1000).toFixed(1)}s` : ""
                  }
                />
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Orta — dilekçe çıktısı */}
      <div className="min-w-0">
        {phase === "idle" && !petition.text && (
          <div className="flex items-center justify-center min-h-[600px] bg-[var(--color-bg-1)] border-2 border-dashed border-[var(--color-line)] rounded-xl">
            <div className="text-center max-w-md p-8">
              <div className="w-16 h-16 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center mx-auto mb-4">
                <Brain size={28} className="text-[var(--color-gold-bright)]" />
              </div>
              <h3 className="font-serif text-xl mb-2">12 Ajan Göreve Hazır</h3>
              <p className="text-[var(--color-text-2)] text-sm mb-5">
                Solda dilekçe tipini ve ayarları seçin, &quot;AI ile Üret&quot; butonuna
                basın. Üst düzey hukuk ofisi kalitesinde dilekçe gerçek zamanlı yazılacak.
              </p>
              {hasDocuments && digest && (
                <div className="text-[11.5px] text-[var(--color-ok)] bg-[var(--color-ok)]/[0.08] border border-[var(--color-ok)]/30 rounded-md p-2.5 mb-3">
                  ✓ {digest.readyDocs} yüklü belge (kronoloji, taraflar, kritik içerikler) dilekçeye otomatik dahil edilecek
                </div>
              )}
              <div className="text-xs text-[var(--color-text-3)] space-y-1">
                <div>✓ Türk hukukuna özel</div>
                <div>✓ Citation doğrulamalı</div>
                <div>✓ Karşı taraf simülasyonlu</div>
                <div>✓ Editor onaylı kalite</div>
              </div>
            </div>
          </div>
        )}

        {(petition.text || petition.isStreaming) && (
          <PetitionDisplay
            text={petition.text}
            isStreaming={petition.isStreaming}
            onCopy={handleCopy}
            copied={copied}
          />
        )}
      </div>

      {/* Sağ — adversarial sonucu */}
      <div className="space-y-3.5">
        {phase === "idle" && !adversarial.text && (
          <Card>
            <h4 className="font-semibold text-[var(--color-gold-bright)] mb-2 text-[13px] flex items-center gap-2">
              <Eye size={14} /> Kalite Güvence
            </h4>
            <p className="text-[11.5px] text-[var(--color-text-2)]">
              Dilekçe üretildikten sonra burada Karşı Taraf Simülatörü&apos;nün yakaladığı
              saldırı argümanları ve önerilen savunmalar görüntülenecek.
            </p>
          </Card>
        )}

        {petition.rag && (
          <Card>
            <h4 className="font-semibold text-[var(--color-gold-bright)] mb-2 text-[13px] flex items-center gap-2">
              <span>📚</span> Kullanılan Kaynaklar
            </h4>
            <p className="text-[11.5px] text-[var(--color-text-2)] mb-2">
              Dilekçe Yazarı, aşağıdaki gerçek emsal ve mevzuat kaynaklarına dayanarak bu dilekçeyi üretti.
            </p>
            <RagProvenancePanel rag={petition.rag} />
          </Card>
        )}

        {(adversarial.text || adversarial.isStreaming) && (
          <AdversarialPanel
            text={adversarial.text}
            isStreaming={adversarial.isStreaming}
          />
        )}
      </div>
    </div>
  );
}

function PhaseStep({
  active,
  done,
  icon: Icon,
  label,
  duration,
}: {
  active: boolean;
  done: boolean;
  icon: React.ElementType;
  label: string;
  duration?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md ${
        active
          ? "bg-[var(--color-info)]/10 text-[var(--color-info)]"
          : done
          ? "text-[var(--color-ok)]"
          : "text-[var(--color-text-3)]"
      }`}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center ${
          active ? "bg-[var(--color-info)]/20" : done ? "bg-[var(--color-ok)]/20" : ""
        }`}
      >
        {done ? <Check size={12} /> : <Icon size={12} className={active ? "animate-pulse-dot" : ""} />}
      </div>
      <span className="flex-1">{label}</span>
      {duration && <span className="text-[10px] opacity-60">{duration}</span>}
    </div>
  );
}

function PetitionDisplay({
  text,
  isStreaming,
  onCopy,
  copied,
}: {
  text: string;
  isStreaming: boolean;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] min-h-[600px] relative"
      style={{ background: "#f7f5ee", color: "#1a1a1a" }}
    >
      {/* Toolbar */}
      <div
        className="flex gap-2 px-4 py-2.5 border-b items-center"
        style={{ background: "#ebe6d9", borderColor: "#d0c8b0" }}
      >
        <span className="text-xs font-medium" style={{ color: "#4a4a4a" }}>
          {isStreaming ? (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-info)] animate-pulse-dot" />
              AI yazıyor...
            </span>
          ) : (
            "Dilekçe Hazır"
          )}
        </span>
        <div className="ml-auto flex gap-1">
          <button
            onClick={onCopy}
            disabled={isStreaming}
            className="px-2.5 py-1 rounded text-xs hover:bg-black/10 disabled:opacity-50 flex items-center gap-1.5"
            style={{ color: "#4a4a4a" }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
          <button
            disabled={isStreaming}
            className="px-2.5 py-1 rounded text-xs hover:bg-black/10 disabled:opacity-50 flex items-center gap-1.5"
            style={{ color: "#4a4a4a" }}
          >
            <Download size={12} /> İndir
          </button>
        </div>
      </div>

      {/* İçerik — markdown */}
      <div
        className="px-12 py-10 text-sm leading-[1.8] max-w-3xl mx-auto"
        style={{ fontFamily: "'Times New Roman', serif" }}
      >
        <PetitionMarkdown content={text} />
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-[var(--color-info)] animate-pulse-dot ml-1 align-middle" />
        )}
      </div>
    </div>
  );
}

/** Beyaz kağıt üzerinde okunabilir markdown — siyah text */
function PetitionMarkdown({ content }: { content: string }) {
  return (
    <div className="prose-petition">
      <style jsx>{`
        .prose-petition :global(h1) {
          text-align: center;
          font-weight: 700;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }
        .prose-petition :global(h2) {
          font-weight: 700;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-top: 1.25rem;
          margin-bottom: 0.625rem;
          color: #1a1a1a;
        }
        .prose-petition :global(h3) {
          font-weight: 600;
          font-size: 13px;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }
        .prose-petition :global(p) {
          margin-bottom: 0.75rem;
          text-align: justify;
          color: #1a1a1a;
        }
        .prose-petition :global(strong) { color: #1a1a1a; font-weight: 700; }
        .prose-petition :global(em) { font-style: italic; }
        .prose-petition :global(ol) { padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .prose-petition :global(ol li) {
          margin-bottom: 0.5rem;
          padding-left: 0.375rem;
          color: #1a1a1a;
        }
        .prose-petition :global(ul) { padding-left: 1.5rem; margin-bottom: 0.75rem; list-style: disc; }
        .prose-petition :global(ul li) { margin-bottom: 0.375rem; color: #1a1a1a; }
        .prose-petition :global(blockquote) {
          border-left: 3px solid #b8a064;
          padding-left: 1rem;
          margin: 0.75rem 0;
          font-style: italic;
          color: #4a4a4a;
        }
        .prose-petition :global(code) {
          background: #f5e9c8;
          padding: 0 0.25rem;
          border-radius: 2px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }
        .prose-petition :global(table) {
          width: 100%;
          border-collapse: collapse;
          margin: 0.75rem 0;
          font-size: 13px;
        }
        .prose-petition :global(th),
        .prose-petition :global(td) {
          border: 1px solid #d0c8b0;
          padding: 6px 10px;
          text-align: left;
        }
        .prose-petition :global(th) { background: #ebe6d9; font-weight: 700; }
        .prose-petition :global(hr) { border: 0; border-top: 1px solid #d0c8b0; margin: 1rem 0; }
      `}</style>
      <Markdown content={content} className="prose-petition-inner" />
    </div>
  );
}

function AdversarialPanel({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  return (
    <Card className="!bg-gradient-to-br !from-[var(--color-danger)]/[0.08] !to-[var(--color-danger)]/[0.02] !border-[var(--color-danger)]/30">
      <h4 className="text-[var(--color-danger)] font-semibold flex items-center gap-2 mb-2.5 text-[13px]">
        <Flame size={14} />
        Karşı Taraf Simülatörü
        {isStreaming && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-normal">
            <span className="w-1 h-1 rounded-full bg-[var(--color-danger)] animate-pulse-dot" />
            saldırı üretiyor...
          </span>
        )}
      </h4>
      <Markdown content={text} />
    </Card>
  );
}
