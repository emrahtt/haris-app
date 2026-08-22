"use client";

/**
 * HARIS v2 — 3-Panel Matter Workspace Layout
 *
 * Karar 2 (kullanıcı onaylı): 3-panel (Harvey kanıtlanmış)
 *  - Sol: VAULT (belgeler) + Workflow Viewer (sticky, küçültülebilir — Karar 3)
 *  - Orta: CANVAS (dilekçe editörü)
 *  - Sağ: CHAT (Orkestra Şefi + @mention)
 *
 * Kullanıcı her paneli daraltabilir/genişletebilir.
 */

import { useState } from "react";

interface ThreePanelLayoutProps {
  vault: React.ReactNode;
  workflowViewer?: React.ReactNode;
  canvas: React.ReactNode;
  chat: React.ReactNode;
  internalDialogs?: React.ReactNode; // İç diyalog dock (Karar 9)
  /** Matter panelinin soluna yapışık dikey çubuk */
  matterRail?: React.ReactNode;
}

export function ThreePanelLayout({
  vault,
  workflowViewer,
  canvas,
  chat,
  internalDialogs,
}: ThreePanelLayoutProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [workflowMinimized, setWorkflowMinimized] = useState(false);
  const [dialogDockOpen, setDialogDockOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* ─── SOL PANEL: VAULT + WORKFLOW VIEWER ─── */}
      <aside
        className={`relative flex flex-col border-r border-white/10 bg-[#0A1628] transition-all duration-200 ${
          leftCollapsed ? "w-12" : "w-80"
        }`}
      >
        {leftCollapsed ? (
          <button
            onClick={() => setLeftCollapsed(false)}
            className="h-full flex flex-col items-center justify-start pt-4 text-slate-500 hover:text-slate-200"
            aria-label="Vault panelini genişlet"
          >
            <span className="text-lg mb-2">📁</span>
            <span className="text-xs writing-mode-vertical [writing-mode:vertical-rl] tracking-wider">
              VAULT
            </span>
          </button>
        ) : (
          <>
            {/* Workflow Viewer — STICKY üst (Karar 3) */}
            {workflowViewer && (
              <div
                className={`border-b border-white/10 bg-[#0A1628]/95 backdrop-blur transition-all ${
                  workflowMinimized ? "max-h-12" : "max-h-[40vh]"
                } overflow-hidden`}
              >
                <div className="flex items-center justify-between px-3 py-2 sticky top-0 bg-[#0A1628]">
                  <span className="text-xs uppercase tracking-widest text-[#C9A961]">
                    🎼 Orkestra Akışı
                  </span>
                  <button
                    onClick={() => setWorkflowMinimized(!workflowMinimized)}
                    className="text-slate-500 hover:text-slate-200 text-xs"
                    aria-label={
                      workflowMinimized ? "Akışı genişlet" : "Akışı küçült"
                    }
                  >
                    {workflowMinimized ? "▾" : "▴"}
                  </button>
                </div>
                {!workflowMinimized && (
                  <div className="px-3 pb-3 overflow-y-auto max-h-[36vh]">
                    {workflowViewer}
                  </div>
                )}
              </div>
            )}

            {/* Vault */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-xs uppercase tracking-widest text-slate-500">
                  📁 Vault
                </span>
                <button
                  onClick={() => setLeftCollapsed(true)}
                  className="text-slate-500 hover:text-slate-200 text-xs"
                  aria-label="Vault panelini daralt"
                >
                  ◀
                </button>
              </div>
              <div className="p-3">{vault}</div>
            </div>

            {/* İç Diyalog Dock — alt (Karar 9) */}
            {internalDialogs && (
              <div className="border-t border-white/10 bg-white/[0.02]">
                <button
                  onClick={() => setDialogDockOpen(!dialogDockOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/[0.03]"
                >
                  <span className="text-slate-400">
                    📜 İç Diyaloglar
                  </span>
                  <span className="text-slate-500">
                    {dialogDockOpen ? "▾" : "▸"}
                  </span>
                </button>
                {dialogDockOpen && (
                  <div className="max-h-[30vh] overflow-y-auto p-3 text-xs">
                    {internalDialogs}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </aside>

      {/* ─── ORTA PANEL: CANVAS ─── */}
      <main className="flex-1 overflow-y-auto bg-[#0E1B30]">{canvas}</main>

      {/* ─── DİKEY İŞLEM ÇUBUĞU + SAĞ PANEL (MATTER) ─── */}
      {matterRail}
      <aside
        className={`relative flex flex-col border-l border-white/10 bg-[#0A1628] transition-all duration-200 ${
          rightCollapsed ? "w-12" : "w-[26rem]"
        }`}
      >
        {rightCollapsed ? (
          <button
            onClick={() => setRightCollapsed(false)}
            className="h-full flex flex-col items-center justify-start pt-4 text-slate-500 hover:text-slate-200"
            aria-label="Chat panelini genişlet"
          >
            <span className="text-lg mb-2">💬</span>
            <span className="text-xs [writing-mode:vertical-rl] tracking-wider">
              ORKESTRA
            </span>
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <span className="text-xs uppercase tracking-widest text-[#C9A961]">
                💬 Orkestra Şefi
              </span>
              <button
                onClick={() => setRightCollapsed(true)}
                className="text-slate-500 hover:text-slate-200 text-xs"
                aria-label="Chat panelini daralt"
              >
                ▶
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{chat}</div>
          </>
        )}
      </aside>
    </div>
  );
}
