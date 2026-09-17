"use client";

import { uuid } from "@/lib/v2/utils/uuid";
import { useState, useCallback, useEffect, useRef } from "react";
import { ThreePanelLayout } from "@/components/v2/layout/three-panel-layout";
import { OrchestraFAB } from "@/components/v2/layout/orchestra-fab";
import { HelpTips } from "@/components/v2/layout/help-tips";
import { VaultPanel } from "@/components/v2/vault/vault-panel";
import { WorkflowViewer } from "@/components/v2/workflow/workflow-viewer";
import { OrchestratorChat } from "@/components/v2/chat/orchestrator-chat";
import { PetitionCanvas } from "@/components/v2/canvas/petition-canvas";
import { CheckpointDialog } from "@/components/v2/workflow/checkpoint-dialog";
import { QualityGateView } from "@/components/v2/canvas/quality-gate-view";
import { WorkspaceSettingsPanel } from "@/components/v2/settings/workspace-settings-panel";
import { MethodPicker, type ExtractionMethod } from "@/components/v2/vault/method-picker";
import { TabularReviewView } from "@/components/v2/tabular/tabular-review-view";
import { SharePanel } from "@/components/v2/sharing/share-panel";
import { V1Bridge } from "@/components/v2/layout/v1-bridge";
import type {
  VaultDocument,
  AgentOutput,
  UserCheckpoint,
  AgentMessage,
  RoundNumber,
} from "@/lib/v2/state/workspace-state";
import { AGENTS, type AgentId } from "@/lib/v2/orchestra/agents";
import type { WorkspaceRow } from "@/lib/v2/workspace/db";

interface ChatMessage {
  id: string;
  role: "user" | "orchestrator" | "agent";
  agentId?: AgentId;
  content: string;
  timestamp: string;
  rawResponse?: unknown;
  citations?: import("@/components/v2/chat/citations-view").Citations;
}

interface Props {
  workspaceId: string;
  initialWorkspace: WorkspaceRow;
  initialDocuments: VaultDocument[];
  initialAgentOutputs: AgentOutput[];
  initialAgentMessages: AgentMessage[];
  initialPetition: { version: number; markdown: string; quality?: unknown } | null;
}

export function WorkspaceClient({
  workspaceId,
  initialWorkspace,
  initialDocuments,
  initialAgentOutputs,
  initialAgentMessages,
  initialPetition,
}: Props) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [documents, setDocuments] = useState<VaultDocument[]>(initialDocuments);
  const [agentOutputs, setAgentOutputs] =
    useState<AgentOutput[]>(initialAgentOutputs);
  const [agentMessages, setAgentMessages] =
    useState<AgentMessage[]>(initialAgentMessages);
  const [petition, setPetition] = useState(initialPetition);
  const [checkpoints, setCheckpoints] = useState<UserCheckpoint[]>([]);
  const [openCheckpointId, setOpenCheckpointId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [showTabular, setShowTabular] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [orchestraStatus, setOrchestraStatus] = useState<string>(
    workspace.orchestration_status
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Initial chat: orkestra şefi karşılaması ──────────────
  // FAZ 15 (React #418 fix): Bu liste eskiden useState initializer'ında
  // üretiliyordu. İçinde `new Date().toLocaleTimeString("tr-TR")` ve `uuid()`
  // olduğu için SUNUCU (Vercel, UTC) ile TARAYICI (Europe/Istanbul) farklı metin
  // üretiyor → hydration mismatch → "Minified React error #418 (text)".
  // Artık sadece client'ta, mount sonrası kuruluyor.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const initialMessagesBuilt = useRef(false);
  useEffect(() => {
    if (initialMessagesBuilt.current) return;
    initialMessagesBuilt.current = true;
    setMessages(buildInitialMessages());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildInitialMessages = (): ChatMessage[] => {
    if (initialAgentMessages.length > 0) {
      return initialAgentMessages
        .filter((m) => m.type === "user_chat" || m.type === "agent_chat" || m.type === "synthesis")
        .map((m) => ({
          id: m.id,
          role: m.from === "user" ? "user" : m.from === "orchestrator" ? "orchestrator" : "agent",
          agentId:
            m.from !== "user" && m.from !== "orchestrator"
              ? (m.from as AgentId)
              : undefined,
          content: m.content,
          timestamp: new Date(m.timestamp).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
    }
    // Hiç mesaj yoksa şefin karşılaması
    const docCount = initialDocuments.length;
    const categories = Array.from(
      new Set(initialDocuments.map((d) => d.category).filter(Boolean))
    );
    const intro =
      docCount === 0
        ? "Merhaba. Henüz belge eklenmemiş. Sol Vault panelinden belge yüklediğinizde davayı inceleyip karşılayabilirim."
        : `Merhaba. ${docCount} belge inceledim${
            categories.length > 0
              ? ` (${categories.slice(0, 3).join(", ")}${
                  categories.length > 3 ? "…" : ""
                })`
              : ""
          }.\n\n` +
          (workspace.case_type
            ? `Bu bir **${workspace.case_type}** dosyası gibi görünüyor. `
            : "") +
          `Aşağıdaki "Süreci Başlat" butonuna basarsanız 12 uzman ajandan uygun olanları görevlendirip 3 turlu inceleme başlatıyorum.\n\nNasıl yardımcı olabilirim?`;
    return [
      {
        id: uuid(),
        role: "orchestrator",
        content: intro,
        timestamp: new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ];
  };

  // ── Vault: yeni dosya ekleme ──────────────────────────────
  const handleAddFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDeleteDocument = useCallback(async (docId: string) => {
    // Optimistic: UI'dan hemen kaldır
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    try {
      await fetch(
        `/api/v2/workspaces/${workspaceId}/documents?docId=${docId}`,
        { method: "DELETE" }
      );
    } catch (e) {
      console.error("Silme hatası:", e);
      // Hata olursa geri yükle
      const res = await fetch(`/api/v2/workspaces/${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents ?? []);
      }
    }
  }, [workspaceId]);

  const handleRetryDocument = useCallback(async (docId: string) => {
    try {
      const res = await fetch(
        `/api/v2/workspaces/${workspaceId}/documents?docId=${docId}`,
        { method: "PATCH" }
      );
      if (res.ok) {
        const data = await res.json();
        alert(data.message || "Belgeyi silip tekrar yükleyin.");
      }
    } catch (e) {
      console.error("Retry hatası:", e);
    }
  }, [workspaceId]);

  const handleClearHistory = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v2/workspaces/${workspaceId}/chat/clear`,
        { method: "POST" }
      );
      if (res.ok) {
        // Sadece karşılama mesajını bırak
        setMessages((prev) => prev.slice(0, 1));
        setAgentMessages([]);
      }
    } catch (e) {
      console.error("Chat temizleme hatası:", e);
    }
  }, [workspaceId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // Picker'ı aç — kullanıcı yöntem seçsin
    setPendingFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFilesWithMethod = async (
    files: File[],
    method: ExtractionMethod
  ) => {
    setPendingFiles(null);
    // Optimistic UI
    const placeholders: VaultDocument[] = files.map((f) => ({
      id: uuid(),
      filename: f.name,
      mimeType: f.type || "application/octet-stream",
      sizeBytes: f.size,
      uploadedAt: new Date().toISOString(),
      status: "uploading",
    }));
    setDocuments((prev) => [...prev, ...placeholders]);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    formData.append("extractionMethod", method);

    try {
      const res = await fetch(
        `/api/v2/workspaces/${workspaceId}/documents`,
        { method: "POST", body: formData }
      );
      if (!res.ok) throw new Error(`Upload başarısız (${res.status})`);
      const wsRes = await fetch(`/api/v2/workspaces/${workspaceId}`);
      if (wsRes.ok) {
        const data = await wsRes.json();
        setDocuments(data.documents ?? []);
      }
    } catch (err) {
      setDocuments((prev) =>
        prev.map((d) =>
          placeholders.find((p) => p.id === d.id)
            ? { ...d, status: "error", summary: String(err) }
            : d
        )
      );
    }
  };

  // ── Süreci başlat (FAZ 15: 4 aşamalı, her aşama ayrı HTTP çağrısı) ──
  //
  // NEDEN: Vercel bir fonksiyonu en fazla 300 saniye çalıştırır, süre dolunca
  // bağlantıyı öldürür (heartbeat kurtarmaz). Tek çağrıda 12 ajan + 3 tur
  // 5-10 dakika sürdüğü için fonksiyon TUR 3'e gelmeden ölüyordu; bu yüzden
  // petition_draft hiç gelmiyor, Canvas boş kalıyordu.
  const ORCHESTRA_STAGES = ["round1", "round2", "draft", "quality"] as const;

  const pushSystemMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: uuid(),
        role: "orchestrator",
        content,
        timestamp: new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  const startOrchestration = async () => {
    if (documents.length === 0) {
      pushSystemMessage("⚠️ Önce sol panelden en az bir belge yükleyin.");
      return;
    }
    setIsOrchestrating(true);
    setOrchestraStatus("running");

    try {
      for (const stage of ORCHESTRA_STAGES) {
        const startedAt = Date.now();
        console.log(`%c[AŞAMA] ${stage} başlıyor`, "color:#C9A961;font-weight:bold");

        const res = await fetch(
          `/api/v2/workspaces/${workspaceId}/orchestrate?stage=${stage}`,
          { method: "POST" }
        );
        if (!res.ok || !res.body) {
          // Faz 16.5: 402 gibi durumlarda sunucunun Türkçe mesajını göster
          let serverMsg = "";
          try {
            const errBody = await res.json();
            serverMsg = typeof errBody?.error === "string" ? errBody.error : "";
          } catch {
            serverMsg = "";
          }
          setOrchestraStatus("error");
          pushSystemMessage(
            serverMsg || `⚠️ Orkestra başlatılamadı (HTTP ${res.status}).`
          );
          return;
        }

        const outcome = await consumeSSE(res.body);
        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        console.log(
          `%c[AŞAMA] ${stage} bitti · ${seconds} sn · temiz kapanış: ${outcome.finished}`,
          "color:#C9A961;font-weight:bold"
        );

        if (outcome.error) {
          setOrchestraStatus("error");
          return; // hata mesajı zaten SSE üzerinden sohbet'e düştü
        }

        if (!outcome.finished) {
          // Sunucu aşamayı bitiremeden bağlantı koptu → büyük olasılıkla Vercel süre limiti
          setOrchestraStatus("error");
          pushSystemMessage(
            `⚠️ **Sunucu bağlantısı "${stage}" aşamasında kesildi** (${seconds} sn sonra).\n\n` +
              `Büyük olasılıkla Vercel fonksiyon süre limiti (300 sn) doldu.\n\n` +
              `Ne yapmalı:\n` +
              `1. Ayarlar'dan ajan sayısını azalt (3-4 ajan yeterli)\n` +
              `2. Dilekçe uzunluğunu "Kısa" yap\n` +
              `3. Analiz modelini hızlandır: HARIS_ANALYZER_MODEL=anthropic:claude-sonnet-5\n` +
              `4. Çok uzun belgeleri kısalt (her belge tüm ajanlara gidiyor)\n\n` +
              `Ardından tekrar "Süreci Başlat" de.`
          );
          return;
        }
      }
    } catch (err) {
      console.error(err);
      setOrchestraStatus("error");
      pushSystemMessage(`⚠️ Orkestra hatası: ${String(err)}`);
    } finally {
      setIsOrchestrating(false);
    }
  };

  const consumeSSE = async (
    stream: ReadableStream<Uint8Array>
  ): Promise<{ finished: boolean; error: boolean }> => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    // FAZ 15: aşama düzgün kapandı mı? (stage_complete / completed / error geldi mi)
    let finished = false;
    let errored = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log(
          `%c[SSE] stream tamamlandı · temiz kapanış: ${finished}`,
          "color:#94a3b8"
        );
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const evt of events) {
        if (!evt.trim()) continue;
        const dataLine = evt
          .split("\n")
          .find((l) => l.startsWith("data: "));
        if (!dataLine) continue;
        try {
          const payload = JSON.parse(dataLine.slice(6));
          // Faz 13.8: debug log — herzaman aktif (production'da da yararlı)
          if (typeof window !== "undefined") {
            const dbg = (window as unknown as { __harisDebug?: boolean }).__harisDebug;
            if (dbg !== false) {
              console.log(
                `%c[SSE ${payload.type}]`,
                "color:#C9A961;font-weight:bold",
                payload
              );
            }
          }
          if (
            payload.type === "stage_complete" ||
            payload.type === "completed"
          ) {
            finished = true;
          }
          if (payload.type === "error") errored = true;
          handleSSEEvent(payload);
        } catch (e) {
          console.warn("[SSE parse hatası]", e, "raw:", dataLine.slice(6, 200));
        }
      }
    }
    return { finished, error: errored };
  };

  const handleSSEEvent = (event: {
    type: string;
    [k: string]: unknown;
  }) => {
    switch (event.type) {
      case "round_start":
        setWorkspace((w) => ({
          ...w,
          current_round: event.round as RoundNumber,
        }));
        break;
      case "agent_start":
        setAgentOutputs((prev) => [
          ...prev.filter(
            (o) =>
              !(o.agentId === event.agentId && o.round === event.round)
          ),
          {
            agentId: event.agentId as AgentId,
            round: event.round as RoundNumber,
            startedAt: new Date().toISOString(),
            status: "running",
          },
        ]);
        break;
      case "agent_done":
        setAgentOutputs((prev) =>
          prev.map((o) =>
            o.agentId === event.agentId && o.round === event.round
              ? {
                  ...o,
                  status: "done",
                  finishedAt: new Date().toISOString(),
                  content: event.content as string,
                  tokensUsed: event.tokensUsed as {
                    input: number;
                    output: number;
                  },
                  cost: event.cost as number,
                  rawResponse: event.rawResponse,
                }
              : o
          )
        );
        break;
      case "agent_message":
        setAgentMessages((prev) => [
          ...prev,
          {
            id: uuid(),
            from: event.from as AgentMessage["from"],
            to: event.to as AgentMessage["to"],
            round: event.round as RoundNumber,
            timestamp: new Date().toISOString(),
            content: event.content as string,
            type: event.messageType as AgentMessage["type"],
          },
        ]);
        break;
      case "checkpoint":
        setCheckpoints((prev) => [...prev, event.checkpoint as UserCheckpoint]);
        setOpenCheckpointId((event.checkpoint as UserCheckpoint).id);
        setOrchestraStatus("paused_for_user");
        break;
      case "petition_draft":
        console.log(
          `%c[CANVAS] petition_draft v${event.version} alındı, ${
            (event.markdown as string)?.length ?? 0
          } karakter`,
          "color:#4ade80;font-weight:bold"
        );
        setPetition({
          version: event.version as number,
          markdown: event.markdown as string,
          quality: event.quality,
        });
        break;
      case "orchestrator_message":
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("haris:memory-refresh"));
        }
        setMessages((prev) => [
          ...prev,
          {
            id: uuid(),
            role: "orchestrator",
            content: event.content as string,
            timestamp: new Date().toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
        break;
      case "stage_complete":
        console.log(
          `%c[AŞAMA TAMAM] ${String(event.stage)}`,
          "color:#4ade80;font-weight:bold"
        );
        break;
      case "completed":
        setOrchestraStatus("completed");
        setWorkspace((w) => ({ ...w, current_round: 3 }));
        break;
      case "error":
        // Faz 14.1: Ham JSON'u browser alert'ine basmak yerine sohbet akışına
        // okunur Türkçe mesaj olarak yaz (kullanıcı çözüm adımını görsün).
        setOrchestraStatus("error");
        setMessages((prev) => [
          ...prev,
          {
            id: uuid(),
            role: "orchestrator",
            content: `⚠️ **Orkestra durdu**\n\n${String(event.message ?? "Bilinmeyen hata")}`,
            timestamp: new Date().toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
        break;
    }
  };

  // ── Checkpoint çözümleme ────────────────────────────────
  const handleCheckpointResolve = async (
    checkpointId: string,
    choice: string
  ) => {
    setCheckpoints((prev) =>
      prev.map((c) =>
        c.id === checkpointId
          ? { ...c, userChoice: choice, resolvedAt: new Date().toISOString() }
          : c
      )
    );
    setOpenCheckpointId(null);
    setOrchestraStatus("running");
    await fetch(
      `/api/v2/workspaces/${workspaceId}/orchestrate/resume`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpointId, choice }),
      }
    );
  };

  // ── Chat gönderme ────────────────────────────────────────
  const handleSend = async (
    content: string,
    mentionedAgents: AgentId[]
  ) => {
    // FAZ 13.5.6: Doğal dil komut tespiti — kullanıcı chat'te "başlat" yazınca orkestra
    const trimmedLower = content.trim().toLowerCase();
    const startCommands = [
      "başla", "başlat", "başlayalım", "başlayabilir",
      "süreci başlat", "orkestra başla", "orkestrayı başlat",
      "start", "başlıyoruz", "hadi başla", "haydi başla",
      "3 tur başlat", "üç tur başlat", "analiz başla",
    ];
    const isStartCommand = startCommands.some((cmd) =>
      trimmedLower === cmd || trimmedLower.startsWith(cmd + " ") || trimmedLower.startsWith(cmd + "!")
    );
    if (
      isStartCommand &&
      !isOrchestrating &&
      orchestraStatus !== "running" &&
      documents.length > 0
    ) {
      // Kullanıcı mesajı ekle
      const userMsgStart: ChatMessage = {
        id: uuid(),
        role: "user",
        content,
        timestamp: new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      const ackMsg: ChatMessage = {
        id: uuid(),
        role: "orchestrator",
        content: "🎼 Anladım, süreci başlatıyorum. 12 uzman ajanın 3 turlu incelemesi başlıyor. Bu 2-4 dakika sürecek, sağdaki workflow viewer'dan takip edebilirsiniz.",
        timestamp: new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, userMsgStart, ackMsg]);
      // Orkestrayı başlat
      void startOrchestration();
      return;
    }

    setIsSending(true);
    const userMsg: ChatMessage = {
      id: uuid(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch(
        `/api/v2/workspaces/${workspaceId}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, mentionedAgents }),
        }
      );
      if (!res.ok) throw new Error(`Chat hata (${res.status})`);
      const data = await res.json();
      const targetAgent = (mentionedAgents[0] ?? null) as AgentId | null;
      // Memory panel refresh trigger (AI yeni bilgi eklemiş olabilir)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("haris:memory-refresh"));
      }
      setMessages((prev) => [
        ...prev,
        {
          id: uuid(),
          role: targetAgent ? "agent" : "orchestrator",
          agentId: targetAgent ?? undefined,
          content: data.reply ?? "[Yanıt boş]",
          timestamp: new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          rawResponse: data.rawResponse,
          citations: data.citations,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: uuid(),
          role: "orchestrator",
          content: `Hata: ${String(e)}`,
          timestamp: new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleAgentClick = (agentId: AgentId) => {
    const agent = AGENTS[agentId];
    const output = agentOutputs.find(
      (o) => o.agentId === agentId && o.round === workspace.current_round
    );
    if (!output) {
      alert(`${agent.emoji} ${agent.displayName}\nHenüz çalışmadı.`);
      return;
    }
    const ham = output.rawResponse
      ? `\n\n🔍 HAM YANIT:\n${JSON.stringify(output.rawResponse, null, 2).slice(0, 600)}`
      : "";
    alert(
      `${agent.emoji} ${agent.displayName}\nModel: ${agent.modelRole}\nDurum: ${output.status}\nToken: ${
        output.tokensUsed?.input ?? 0
      } in / ${output.tokensUsed?.output ?? 0} out\nMaliyet: $${
        output.cost?.toFixed(4) ?? "0"
      }\n\nÇIKTI:\n${(output.content ?? "[boş]").slice(0, 800)}${ham}`
    );
  };

  // ── İç diyalog dock içeriği ──────────────────────────────
  const internalDialogsContent =
    agentMessages.length === 0 ? (
      <div className="text-[11px] text-slate-500 py-2 text-center">
        Henüz iç diyalog yok. Orkestra başladığında ajan-ajan konuşmalar
        burada görünür.
      </div>
    ) : (
      <div className="space-y-2 text-[11px]">
        {agentMessages.slice(-12).map((m) => {
          const fromAgent =
            m.from !== "user" && m.from !== "orchestrator"
              ? AGENTS[m.from as AgentId]
              : null;
          const toAgent =
            m.to !== "broadcast" && AGENTS[m.to as AgentId];
          return (
            <div key={m.id} className="text-slate-400">
              <span className="text-[#C9A961]">
                {m.from === "orchestrator" ? "🎼" : fromAgent?.emoji ?? "👤"}{" "}
                {m.from === "orchestrator" ? "Şef" : fromAgent?.shortName ?? "Siz"}{" "}
                → {toAgent ? `${toAgent.emoji} ${toAgent.shortName}` : "Hepsi"}:
              </span>
              <div className="mt-0.5 pl-3 text-slate-500 line-clamp-3">
                {m.content}
              </div>
            </div>
          );
        })}
      </div>
    );

  const currentRound = (workspace.current_round || 0) as 0 | 1 | 2 | 3;

  // Kalite raporu var mı kontrol et
  const qualityReport = petition?.quality as
    | {
        paragraphs?: Array<{
          index: number;
          category: "gerekli" | "nüans" | "doldurma";
          score: number;
          reason: string;
        }>;
        summary?: { gerekli: number; nuans: number; doldurma: number; kalite_skoru: number };
      }
    | undefined;

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.txt,.md,.udf,image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top action bar */}
      <div className="px-6 py-2 border-b border-white/5 bg-[#0A1628] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold truncate max-w-md">
            {workspace.title}
          </h2>
          {orchestraStatus === "running" ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Çalışıyor
              <span className="ml-1 inline-block w-3 h-3 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
            </span>
          ) : orchestraStatus === "paused_for_user" ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
              🟡 Kullanıcı bekleniyor
            </span>
          ) : orchestraStatus === "completed" ? (
            <span className="text-[10px] uppercase tracking-widest text-emerald-300">
              ✓ Tamamlandı
            </span>
          ) : orchestraStatus === "error" ? (
            <span className="text-[10px] uppercase tracking-widest text-rose-300">
              ⚠ Hata
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-widest text-slate-500">
              ⏸ Hazır
            </span>
          )}
        </div>
        <button
          onClick={startOrchestration}
          disabled={
            isOrchestrating ||
            orchestraStatus === "running" ||
            documents.length === 0
          }
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
            !isOrchestrating &&
            orchestraStatus !== "running" &&
            documents.length > 0
              ? "bg-[#C9A961] text-[#0A1628] hover:bg-[#e6c479]"
              : "bg-white/5 text-slate-500 cursor-not-allowed"
          }`}
        >
          {orchestraStatus === "running" ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-slate-400/40 border-t-slate-100 rounded-full animate-spin" />
              Çalışıyor…
            </span>
          ) : orchestraStatus === "completed" ? (
            "Yeniden Başlat"
          ) : (
            "🎼 Süreci Başlat"
          )}
        </button>
        <button
          onClick={() => setShowTabular(true)}
          className="ml-2 px-3 py-1.5 rounded-lg text-sm border border-white/10 hover:bg-white/5 text-slate-300"
          title="Belge Matrisi (Tabular Review)"
          disabled={documents.length === 0}
        >
          📊
        </button>
        <button
          onClick={() => setShowShare(true)}
          className="ml-1 px-3 py-1.5 rounded-lg text-sm border border-white/10 hover:bg-white/5 text-slate-300"
          title="Paylaş"
        >
          🤝
        </button>
        <div className="ml-1">
          <V1Bridge workspaceId={workspaceId} />
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="ml-1 px-3 py-1.5 rounded-lg text-sm border border-white/10 hover:bg-white/5 text-slate-300"
          title="Workspace ayarları"
        >
          ⚙️
        </button>
      </div>

      <ThreePanelLayout
        vault={
          <VaultPanel
            documents={documents}
            onAddFiles={handleAddFiles}
            onDeleteDocument={handleDeleteDocument}
            onRetryDocument={handleRetryDocument}
          />
        }
        workflowViewer={
          <WorkflowViewer
            currentRound={currentRound}
            agentOutputs={agentOutputs}
            checkpoints={checkpoints}
            onAgentClick={handleAgentClick}
            onCheckpointClick={(id) => setOpenCheckpointId(id)}
          />
        }
        canvas={
          qualityReport && qualityReport.paragraphs ? (
            <QualityGateView
              markdown={petition?.markdown ?? ""}
              report={qualityReport as { paragraphs: NonNullable<typeof qualityReport.paragraphs>; summary: NonNullable<typeof qualityReport.summary> }}
            />
          ) : (
            <PetitionCanvas
              workspaceId={workspaceId}
              markdown={petition?.markdown}
              version={petition?.version}
              isGenerating={
                isOrchestrating && currentRound === 3 && !petition
              }
              emptyHint={
                documents.length === 0
                  ? "Sol panelden belge ekleyin, sonra üst bardaki '🎼 Süreci Başlat' düğmesine basın."
                  : "Orkestra Şefi sürec başlatıldığında dilekçe taslağı burada belirecek."
              }
            />
          )
        }
        chat={<OrchestratorChat messages={messages} onSend={handleSend} onClearHistory={handleClearHistory} workspaceId={workspaceId} isSending={isSending} />}
        internalDialogs={internalDialogsContent}
      />

      {/* Settings modal */}
      {showSettings && (
        <WorkspaceSettingsPanel
          initialPreferences={{
            petitionLength: workspace.preferences?.petitionLength ?? "standard",
            qualityMode: workspace.preferences?.qualityMode ?? "strict",
            checkpointMode: workspace.preferences?.checkpointMode ?? "ask_on_conflict",
            showInternalDialogs: workspace.preferences?.showInternalDialogs ?? false,
            showRawResponses: workspace.preferences?.showRawResponses ?? false,
            enabledAgents: workspace.preferences?.enabledAgents ?? [],
          }}
          onSave={async (newPrefs) => {
            await fetch(`/api/v2/workspaces/${workspaceId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ preferences: newPrefs }),
            });
            setWorkspace((w) => ({ ...w, preferences: newPrefs }));
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* OCR Method Picker */}
      {pendingFiles && pendingFiles.length > 0 && (
        <MethodPicker
          files={pendingFiles}
          defaultMethod={
            (typeof window !== "undefined" &&
              (localStorage.getItem("haris_default_ocr_method") as ExtractionMethod)) ||
            "auto"
          }
          onConfirm={(method) => uploadFilesWithMethod(pendingFiles, method)}
          onCancel={() => setPendingFiles(null)}
        />
      )}

      {/* Tabular Review modal */}
      {showTabular && (
        <TabularReviewView
          workspaceId={workspaceId}
          documents={documents}
          onClose={() => setShowTabular(false)}
        />
      )}

      {/* Share modal */}
      {showShare && (
        <SharePanel
          workspaceId={workspaceId}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Checkpoint modal */}
      {openCheckpointId && (
        <CheckpointDialog
          checkpoint={checkpoints.find((c) => c.id === openCheckpointId)!}
          onResolve={(choice) =>
            handleCheckpointResolve(openCheckpointId, choice)
          }
          onClose={() => setOpenCheckpointId(null)}
        />
      )}

      {/* Faz 13.8: Floating Action Button — Süreci Başlat (herzaman görünür) */}
      <OrchestraFAB
        onStart={startOrchestration}
        onOpenTabular={() => setShowTabular(true)}
        status={orchestraStatus as "idle" | "running" | "paused_for_user" | "completed" | "error"}
        documentsReady={documents.filter((d) => d.status === "ready").length}
        documentsTotal={documents.length}
      />

      {/* Faz 13.9: Help Tips — ilk açılışta 5 adımlı rehber (sol alt) */}
      <HelpTips documentsCount={documents.length} />
    </>
  );
}

