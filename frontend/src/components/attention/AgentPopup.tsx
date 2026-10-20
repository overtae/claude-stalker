"use client";

import { useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAttentionStore, selectFocusPopup } from "@/stores/attentionStore";
import { useGameStore, selectSessionId } from "@/stores/gameStore";
import { useTranslation } from "@/hooks/useTranslation";
import type { AgentAnimationState } from "@/stores/gameStore";
import type { TranslationKey } from "@/i18n";
import { CLAUDE_COLOR, agentColor, toCssColor } from "@/utils/stalkerFormat";

const POPUP_WIDTH = 260;
const POPUP_MARGIN = 16;

export default function AgentPopup(): ReactNode {
  const focusPopup = useAttentionStore(selectFocusPopup);
  const closeFocusPopup = useAttentionStore((s) => s.closeFocusPopup);
  const focusAgentTerminal = useAttentionStore((s) => s.focusAgentTerminal);
  const agents = useGameStore((s) => s.agents);
  const boss = useGameStore((s) => s.boss);
  const sessionId = useGameStore(selectSessionId);
  const { t } = useTranslation();

  const handleFocusTerminal = useCallback(() => {
    if (!sessionId) return;
    focusAgentTerminal(sessionId, focusPopup?.agentId ?? null);
  }, [sessionId, focusAgentTerminal, focusPopup]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFocusPopup();
    },
    [closeFocusPopup],
  );

  useEffect(() => {
    if (focusPopup) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [focusPopup, handleKeyDown]);

  if (!focusPopup) return null;

  const isBoss = focusPopup.agentId === "boss";
  const agent: AgentAnimationState | null = isBoss
    ? null
    : (agents.get(focusPopup.agentId) ?? null);

  // Viewport-clamped positioning
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = focusPopup.screenX + 20;
  let y = focusPopup.screenY - 60;
  if (x + POPUP_WIDTH > vw - POPUP_MARGIN)
    x = focusPopup.screenX - POPUP_WIDTH - 20;
  if (y + 200 > vh - POPUP_MARGIN) y = vh - 200 - POPUP_MARGIN;
  if (y < POPUP_MARGIN) y = POPUP_MARGIN;

  const displayName = isBoss
    ? t("stalker.claude")
    : (agent?.name ?? focusPopup.agentId);
  const displayColor = toCssColor(
    isBoss ? CLAUDE_COLOR : agentColor(agent?.number ?? 1),
  );
  const displayState = isBoss
    ? t(`bossState.${boss.backendState}` as TranslationKey)
    : agent
      ? t(`agentState.${agent.backendState}` as TranslationKey)
      : "—";
  const displayTask = isBoss ? boss.currentTask : agent?.currentTask;
  const displayType = isBoss
    ? t("stalker.roleMain")
    : (agent?.characterType ?? t("stalker.roleSub"));
  const displayDesk = isBoss ? null : agent?.desk;

  const popup = (
    <div
      className="fixed inset-0 z-[90]"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeFocusPopup();
      }}
    >
      <div className="absolute inset-0" />
      <div
        className="absolute rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl shadow-slate-900/10"
        style={{ left: x, top: y, width: POPUP_WIDTH }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: displayColor }}
          />
          <span className="flex-1 truncate text-sm font-bold text-slate-800">
            {displayName}
          </span>
          {displayDesk !== null && (
            <span className="text-[11px] text-slate-400">
              {t("attention.popup.desk")} #{displayDesk}
            </span>
          )}
        </div>

        <div className="mb-3 space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
          <div>
            <span className="text-slate-400">
              {t("attention.popup.state")}:
            </span>{" "}
            {displayState}
          </div>
          {displayTask && (
            <div className="truncate">
              <span className="text-slate-400">
                {t("attention.popup.task")}:
              </span>{" "}
              {displayTask}
            </div>
          )}
          <div>
            <span className="text-slate-400">{t("attention.popup.type")}:</span>{" "}
            {displayType}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleFocusTerminal}
            className="flex-1 rounded-xl bg-claude-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-claude-600"
          >
            {t("attention.popup.focusTerminal")}
          </button>
          <button
            onClick={closeFocusPopup}
            className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            {t("attention.popup.close")}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(popup, document.body);
}
