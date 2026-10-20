"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { Session } from "@/hooks/useSessions";
import { stalkerTheme } from "@/constants/stalkerTheme";
import { StalkerLeftRail } from "@/components/stalker/StalkerLeftRail";
import { StalkerRightRail } from "@/components/stalker/StalkerRightRail";
import { StalkerMapHeader } from "@/components/stalker/StalkerMapHeader";
import { StalkerLangSync } from "@/components/stalker/StalkerLangSync";
import { useTranslation } from "@/hooks/useTranslation";
import { buildFloors, projectKey } from "@/utils/stalkerFormat";

const StalkerGameCanvas = dynamic(
  () =>
    import("@/components/stalker/StalkerGameCanvas").then((m) => ({
      default: m.StalkerGameCanvas,
    })),
  {
    ssr: false,
    loading: () => null,
  },
);

/** Relative times ("3분 전") refresh on this cadence. */
const CLOCK_TICK_MS = 30_000;

export interface StalkerShellProps {
  onOpenSettings: () => void;
  sessions: Session[];
  sessionsLoading: boolean;
  sessionId: string;
  onSessionSelect: (id: string) => Promise<void>;
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function StalkerShell({
  onOpenSettings,
  sessions,
  sessionsLoading,
  sessionId,
  onSessionSelect,
}: StalkerShellProps): ReactNode {
  const { t } = useTranslation();
  const now = useNow();
  const floors = useMemo(() => buildFloors(t, sessions), [t, sessions]);
  const session = sessions.find((s) => s.id === sessionId) ?? null;
  const activeFloorKey = session ? projectKey(session) : null;
  const activeFloor = floors.find((f) => f.key === activeFloorKey) ?? null;

  return (
    <div
      className="flex h-screen gap-2.5 p-2.5"
      style={{ background: stalkerTheme.pageBg, color: stalkerTheme.text }}
    >
      <StalkerLangSync />
      <StalkerLeftRail
        floors={floors}
        activeFloorKey={activeFloorKey}
        sessionsLoading={sessionsLoading}
        sessionId={sessionId}
        now={now}
        onSessionSelect={onSessionSelect}
      />

      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl border border-slate-200/70 bg-[#eef2f6] shadow-sm">
        <StalkerGameCanvas />
        <StalkerMapHeader floor={activeFloor} session={session} />
      </main>

      <StalkerRightRail
        session={session}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
}
