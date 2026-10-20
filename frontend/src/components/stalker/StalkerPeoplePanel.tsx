"use client";

import type { ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { useGameStore, selectAgents, selectBoss } from "@/stores/gameStore";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/i18n";
import type { BubbleContent } from "@/types";
import { CLAUDE_COLOR, agentColor, toCssColor } from "@/utils/stalkerFormat";

/** Three tones only: busy (accent), needs-you (amber), everything else (neutral). */
const BUSY = "bg-teal-50 text-teal-700";
const PILL_STYLES: Record<string, string> = {
  thinking: BUSY,
  working: BUSY,
  delegating: BUSY,
  reviewing: BUSY,
  receiving: BUSY,
  waiting_permission: "bg-amber-50 text-amber-700",
};
const DEFAULT_PILL = "bg-slate-100 text-slate-600";

interface PersonRowProps {
  avatar: string;
  color: number;
  name: string;
  role: string;
  stateLabel: string;
  stateKey: string;
  bubble: BubbleContent | null;
  task: string | null;
}

function PersonRow({
  avatar,
  color,
  name,
  role,
  stateLabel,
  stateKey,
  bubble,
  task,
}: PersonRowProps): ReactNode {
  return (
    <li className="flex gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-inner"
        style={{ background: toCssColor(color) }}
        aria-hidden
      >
        {avatar}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-slate-800">{name}</span>
          <span className="shrink-0 text-[10px] text-slate-400">{role}</span>
          <span
            className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              PILL_STYLES[stateKey] ?? DEFAULT_PILL
            }`}
          >
            {stateLabel}
          </span>
        </div>
        {bubble && (
          <p className="mt-0.5 truncate text-xs text-slate-600">
            {bubble.icon && <span className="mr-1">{bubble.icon}</span>}
            {bubble.text}
          </p>
        )}
        {task && <p className="mt-0.5 truncate text-[11px] text-slate-400">{task}</p>}
      </div>
    </li>
  );
}

export function StalkerPeoplePanel(): ReactNode {
  const { t } = useTranslation();
  const boss = useGameStore(selectBoss);
  const agents = useGameStore(useShallow(selectAgents));
  const agentList = [...agents.values()].sort((a, b) => a.number - b.number);
  const headcount = agentList.length + 1;

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm">
      <header className="flex items-center justify-between px-1 pb-1">
        <h2 className="text-sm font-bold text-slate-800">{t("stalker.officePeople")}</h2>
        <span className="text-[11px] text-slate-400">
          {t("stalker.peopleCount", { count: headcount })}
        </span>
      </header>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        <PersonRow
          avatar="✳"
          color={CLAUDE_COLOR}
          name={t("stalker.claude")}
          role={t("stalker.roleMain")}
          stateKey={boss.backendState}
          stateLabel={t(`bossState.${boss.backendState}` as TranslationKey)}
          bubble={boss.bubble.content}
          task={boss.currentTask}
        />
        {agentList.map((agent) => {
          const name = agent.name ?? `${t("agentStatus.agent")} #${agent.number}`;
          return (
            <PersonRow
              key={agent.id}
              avatar={name.trim().charAt(0).toUpperCase()}
              color={agentColor(agent.number)}
              name={name}
              role={agent.characterType ?? t("stalker.roleSub")}
              stateKey={agent.backendState}
              stateLabel={t(`agentState.${agent.backendState}` as TranslationKey)}
              bubble={agent.bubble.content}
              task={agent.currentTask}
            />
          );
        })}
      </ul>
    </section>
  );
}
