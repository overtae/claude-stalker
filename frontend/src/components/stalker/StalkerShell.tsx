"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { Session } from "@/hooks/useSessions";
import { useStalkerTheme } from "@/hooks/useStalkerTheme";
import { StalkerThemeSync } from "@/components/stalker/StalkerThemeSync";
import { StalkerLeftRail } from "@/components/stalker/StalkerLeftRail";
import { StalkerRightRail } from "@/components/stalker/StalkerRightRail";
import { StalkerMapHeader } from "@/components/stalker/StalkerMapHeader";
import { StalkerLangSync } from "@/components/stalker/StalkerLangSync";
import { useTranslation } from "@/hooks/useTranslation";
import { buildFloors, sessionTitle } from "@/utils/stalkerFormat";
import { useNavigationStore } from "@/stores/navigationStore";
import { useMainAgentStore } from "@/stores/mainAgentStore";
import { toAgentSource } from "@/utils/agentBrand";
import CommandBar, {
  type CommandEntry,
} from "@/components/attention/CommandBar";
import AttentionToasts from "@/components/attention/AttentionToasts";
import AgentPopup from "@/components/attention/AgentPopup";

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
  const stalkerTheme = useStalkerTheme();
  const now = useNow();
  const buildingConfig = useNavigationStore((s) => s.buildingConfig);
  const floors = useMemo(
    () => buildFloors(t, sessions, buildingConfig),
    [t, sessions, buildingConfig],
  );
  const session = sessions.find((s) => s.id === sessionId) ?? null;
  // Who drives this session (Claude Code, Cursor…) — names/colours the main agent.
  const setAgentSource = useMainAgentStore((s) => s.setSource);
  const agentSource = toAgentSource(session?.agentSource);
  useEffect(() => setAgentSource(agentSource), [agentSource, setAgentSource]);
  const activeFloor =
    floors.find((f) => f.sessions.some((s) => s.id === sessionId)) ?? null;
  const hasConfiguredFloors = (buildingConfig?.floors.length ?? 0) > 0;

  // ⌘K: jump to any floor, any session on this floor, or open settings.
  const commands = useMemo<CommandEntry[]>(
    () => [
      ...floors
        .filter((f) => f.sessions.length > 0 && f.key !== activeFloor?.key)
        .map((f) => ({
          id: `floor-${f.key}`,
          label: t("stalker.cmd.goFloor", { floor: f.floor, name: f.name }),
          icon: f.icon ?? "🏢",
          action: () => void onSessionSelect(f.sessions[0].id),
        })),
      ...(activeFloor?.sessions ?? [])
        .filter((s) => s.id !== sessionId)
        .map((s) => ({
          id: `session-${s.id}`,
          label: t("stalker.cmd.openSession", { title: sessionTitle(t, s) }),
          icon: "📌",
          action: () => void onSessionSelect(s.id),
        })),
      {
        id: "open-settings",
        label: t("stalker.cmd.openSettings"),
        icon: "⚙️",
        action: onOpenSettings,
      },
    ],
    [floors, activeFloor, sessionId, onSessionSelect, onOpenSettings, t],
  );

  return (
    <div
      className="flex h-screen gap-2.5 p-2.5"
      style={{ background: stalkerTheme.pageBg, color: stalkerTheme.text }}
    >
      <StalkerLangSync />
      <StalkerThemeSync />
      <StalkerLeftRail
        floors={floors}
        activeFloorKey={activeFloor?.key ?? null}
        buildingName={
          hasConfiguredFloors ? (buildingConfig?.buildingName ?? null) : null
        }
        sessionsLoading={sessionsLoading}
        sessionId={sessionId}
        now={now}
        onSessionSelect={onSessionSelect}
      />

      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl border border-slate-200/70 bg-[#eef2f6] shadow-sm dark:border-neutral-700/70 dark:bg-[#262626]">
        <StalkerGameCanvas />
        <StalkerMapHeader floor={activeFloor} session={session} />
      </main>

      <CommandBar extraCommands={commands} />
      <AttentionToasts />
      <AgentPopup />

      <StalkerRightRail session={session} onOpenSettings={onOpenSettings} />
    </div>
  );
}
