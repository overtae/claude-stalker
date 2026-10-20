"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AgentStatus } from "@/components/game/AgentStatus";
import { EventLog } from "@/components/layout/EventLog";
import { useStalkerTheme } from "@/hooks/useStalkerTheme";

export interface StalkerActivityPanelProps {
  open: boolean;
  onToggle: () => void;
}

export function StalkerActivityPanel({
  open,
  onToggle,
}: StalkerActivityPanelProps): ReactNode {
  const stalkerTheme = useStalkerTheme();

  return (
    <div
      className="pointer-events-auto fixed bottom-4 right-4 z-30 flex max-h-[min(70vh,520px)] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border shadow-lg"
      style={{
        background: stalkerTheme.surface,
        borderColor: stalkerTheme.border,
        boxShadow: stalkerTheme.shadow,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex shrink-0 cursor-pointer items-center justify-between border-b px-3 py-2 text-left text-sm font-semibold text-slate-800 dark:text-neutral-100"
        style={{ borderColor: stalkerTheme.border }}
      >
        활동 · 이벤트
        {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
      {open && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
          <div className="h-36 min-h-0 shrink-0 overflow-hidden rounded-lg border border-slate-200">
            <AgentStatus />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200">
            <EventLog />
          </div>
        </div>
      )}
    </div>
  );
}
