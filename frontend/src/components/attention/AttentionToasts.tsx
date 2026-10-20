"use client";

import { useEffect, useCallback, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAttentionStore, type UrgencyLevel } from "@/stores/attentionStore";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/i18n";
import type { EventType } from "@/types";

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  critical: "border-rose-200 bg-rose-50/95 text-rose-700",
  high: "border-amber-200 bg-amber-50/95 text-amber-800",
  low: "border-emerald-200 bg-emerald-50/95 text-emerald-700",
  info: "border-slate-200 bg-white/95 text-slate-700",
};

/** Human sentence per event type; anything else falls back to the raw title. */
const TOAST_KEYS: Partial<Record<EventType, TranslationKey>> = {
  permission_request: "attention.toast.permissionRequest",
  error: "attention.toast.error",
  stop: "attention.toast.stop",
  task_completed: "attention.toast.taskCompleted",
  subagent_start: "attention.toast.agentArrived",
  background_task_notification: "attention.toast.backgroundTask",
};

const URGENCY_ICONS: Record<UrgencyLevel, string> = {
  critical: "\u26A0\uFE0F",
  high: "\uD83D\uDD34",
  low: "\u2705",
  info: "\uD83D\uDD35",
};

export default function AttentionToasts(): ReactNode {
  const toasts = useAttentionStore(
    useShallow((s) => s.toastQueue.filter((t) => !t.dismissed)),
  );
  const dismissToast = useAttentionStore((s) => s.dismissToast);
  const openFocusPopup = useAttentionStore((s) => s.openFocusPopup);

  const handleToastClick = useCallback(
    (toast: (typeof toasts)[number]) => {
      if (toast.agentId) {
        openFocusPopup(toast.agentId, window.innerWidth / 2, 120);
      }
      dismissToast(toast.id);
    },
    [dismissToast, openFocusPopup],
  );

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-50 flex w-80 -translate-x-1/2 flex-col gap-2">
      {toasts.slice(0, 5).map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClick={() => handleToastClick(toast)}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onClick,
  onDismiss,
}: {
  toast: {
    id: string;
    urgencyLevel: UrgencyLevel;
    agentName: string | null;
    eventType: EventType;
    title: string;
    description: string;
    autoDismissMs: number | null;
  };
  onClick: () => void;
  onDismiss: () => void;
}): ReactNode {
  const { t } = useTranslation();
  const colorClass = URGENCY_COLORS[toast.urgencyLevel];
  const icon = URGENCY_ICONS[toast.urgencyLevel];
  const key = TOAST_KEYS[toast.eventType];
  const who = toast.agentName ?? t("stalker.claude");
  const headline = key
    ? t(key, { agentName: who, taskDescription: toast.description })
    : t(`eventType.${toast.eventType}` as TranslationKey);

  useEffect(() => {
    if (toast.autoDismissMs === null) return;
    const timer = setTimeout(onDismiss, toast.autoDismissMs);
    return () => clearTimeout(timer);
  }, [toast.autoDismissMs, toast.id, onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex cursor-pointer items-start gap-2 rounded-2xl border px-3 py-2 shadow-lg shadow-slate-900/5 backdrop-blur animate-in slide-in-from-top-2 duration-300 ${colorClass}`}
      onClick={onClick}
      role="alert"
    >
      <span className="text-sm shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate">{headline}</p>
        {toast.description && (
          <p className="text-[11px] opacity-80 truncate">{toast.description}</p>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="text-xs opacity-50 hover:opacity-100 shrink-0"
        aria-label={t("modal.close")}
      >
        {"\u2715"}
      </button>
    </div>
  );
}
