"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { Session } from "@/hooks/useSessions";
import { useStalkerTheme } from "@/hooks/useStalkerTheme";

export interface StalkerSessionDrawerProps {
  open: boolean;
  onClose: () => void;
  sessions: Session[];
  sessionsLoading: boolean;
  sessionId: string;
  onSessionSelect: (id: string) => Promise<void>;
}

function sessionLabel(session: Session): string {
  return (
    session.displayName ??
    session.projectName ??
    session.projectRoot?.split("/").pop() ??
    session.id.slice(0, 8)
  );
}

export function StalkerSessionDrawer({
  open,
  onClose,
  sessions,
  sessionsLoading,
  sessionId,
  onSessionSelect,
}: StalkerSessionDrawerProps): ReactNode {
  const stalkerTheme = useStalkerTheme();

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-pointer bg-slate-900/20"
        aria-label="닫기"
        onClick={onClose}
      />
      <aside
        className="fixed left-0 top-0 z-50 flex h-full w-80 max-w-[90vw] flex-col border-r shadow-lg"
        style={{
          background: stalkerTheme.surface,
          borderColor: stalkerTheme.border,
          boxShadow: stalkerTheme.shadow,
        }}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: stalkerTheme.border }}
        >
          <h2
            className="text-sm font-bold"
            style={{ color: stalkerTheme.text }}
          >
            세션
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessionsLoading && (
            <p className="p-3 text-xs text-slate-500">불러오는 중…</p>
          )}
          {!sessionsLoading && sessions.length === 0 && (
            <p className="p-3 text-xs text-slate-500">
              세션 없음 · Claude Code 실행 또는 Simulate
            </p>
          )}
          <ul className="space-y-1">
            {sessions.map((session) => {
              const active = session.id === sessionId;
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => void onSessionSelect(session.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "cursor-default bg-claude-50 font-semibold text-claude-900 dark:bg-claude-950/40 dark:text-claude-200"
                        : "cursor-pointer text-slate-700 hover:bg-slate-50 dark:text-neutral-200 dark:hover:bg-neutral-800/80"
                    }`}
                  >
                    <span className="block truncate">
                      {sessionLabel(session)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {session.status} · {session.eventCount ?? 0} events
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </>
  );
}
