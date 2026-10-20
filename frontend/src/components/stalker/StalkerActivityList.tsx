"use client";

import { useState, type ReactNode } from "react";
import { format } from "date-fns";
import { useShallow } from "zustand/react/shallow";
import {
  useGameStore,
  selectAgents,
  selectEventLog,
  type EventLogEntry,
} from "@/stores/gameStore";
import { usePreferencesStore } from "@/stores/preferencesStore";
import { EventDetailModal } from "@/components/game/EventDetailModal";
import { useTranslation } from "@/hooks/useTranslation";
import { CLAUDE_COLOR, agentColor, toCssColor } from "@/utils/stalkerFormat";

const TIME_FORMAT = { ko: "H시 mm분 ss초", en: "HH:mm:ss" } as const;

/** Activity tab body: event timeline (newest first). */
export function StalkerActivityList(): ReactNode {
  const { t } = useTranslation();
  const language = usePreferencesStore((s) => s.language);
  const eventLog = useGameStore(selectEventLog);
  const agents = useGameStore(useShallow(selectAgents));
  const [selected, setSelected] = useState<EventLogEntry | null>(null);

  const actor = (event: EventLogEntry): { name: string; color: number } => {
    const agent = event.agentId ? agents.get(event.agentId) : undefined;
    if (agent) {
      return {
        name: agent.name ?? `${t("agentStatus.agent")} #${agent.number}`,
        color: agentColor(agent.number),
      };
    }
    return { name: t("stalker.claude"), color: CLAUDE_COLOR };
  };

  return (
    <>
      {eventLog.length === 0 ? (
        <p className="px-1 py-6 text-center text-xs text-slate-400">
          {t("eventLog.waiting")}
        </p>
      ) : (
        <ol className="min-h-0 flex-1 overflow-y-auto">
          {eventLog.map((event, index) => {
            const who = actor(event);
            return (
              <li key={`${event.id}-${index}`}>
                <button
                  type="button"
                  onClick={() => setSelected(event)}
                  className="grid w-full grid-cols-[4.75rem_10px_1fr] items-start gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-slate-50"
                >
                  <span className="pt-0.5 text-[10px] tabular-nums text-slate-400">
                    {format(event.timestamp, TIME_FORMAT[language])}
                  </span>
                  <span
                    className="mt-1.5 h-2 w-2 rounded-full"
                    style={{ background: toCssColor(who.color) }}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-slate-700">
                      {who.name}
                    </span>
                    <span className="line-clamp-2 text-[11px] leading-snug text-slate-500">
                      {event.summary}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
      {selected && (
        <EventDetailModal event={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
