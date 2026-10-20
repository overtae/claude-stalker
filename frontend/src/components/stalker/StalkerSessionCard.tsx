"use client";

import type { ReactNode } from "react";
import { Settings } from "lucide-react";
import type { Session } from "@/hooks/useSessions";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/i18n";
import {
  useGameStore,
  selectContextUtilization,
  selectTodos,
  selectToolUsesSinceCompaction,
  selectWhiteboardData,
} from "@/stores/gameStore";
import { WEATHER_ICONS, getSessionWeather } from "@/utils/sessionWeather";
import { projectName, shortenPath } from "@/utils/stalkerFormat";

/** Context usage above this reads as "getting full" (amber bar). */
const CONTEXT_WARN = 0.75;

interface StalkerSessionCardProps {
  session: Session | null;
  onOpenSettings: () => void;
}

function Meter({
  value,
  warn = false,
}: {
  value: number;
  warn?: boolean;
}): ReactNode {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-neutral-700">
      <span
        className={`block h-full rounded-full transition-[width] duration-500 ${warn ? "bg-rose-400" : "bg-claude-500"}`}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

function StatTile({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  children?: ReactNode;
}): ReactNode {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-neutral-800/80">
      <p className="text-[10px] font-medium text-slate-400 dark:text-neutral-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-bold text-slate-800 dark:text-neutral-100">
        {value}
      </p>
      {children}
      <p className="mt-1 truncate text-[10px] text-slate-400" title={hint}>
        {hint}
      </p>
    </div>
  );
}

export function StalkerSessionCard({
  session,
  onOpenSettings,
}: StalkerSessionCardProps): ReactNode {
  const { t } = useTranslation();
  const whiteboard = useGameStore(selectWhiteboardData);
  const context = useGameStore(selectContextUtilization);
  const toolUses = useGameStore(selectToolUsesSinceCompaction);
  const todos = useGameStore(selectTodos);

  const weather = getSessionWeather(whiteboard);
  const todosDone = todos.filter((todo) => todo.status === "completed").length;
  const todosActive = todos.filter(
    (todo) => todo.status === "in_progress",
  ).length;

  return (
    <section className="shrink-0 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm dark:border-neutral-700/70 dark:bg-neutral-900">
      <div className="flex items-start gap-2 px-1">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-slate-400">
            {t("stalker.currentSession")}
          </p>
          <p className="truncate text-sm font-bold text-slate-800 dark:text-neutral-100">
            {session ? projectName(t, session) : "—"}
          </p>
          {session?.projectRoot && (
            <p
              className="truncate font-mono text-[10.5px] text-slate-400"
              title={session.projectRoot}
            >
              {shortenPath(session.projectRoot)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label={t("stalker.settings")}
          title={t("stalker.settings")}
          className="-mr-1 -mt-0.5 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <Settings size={16} />
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <StatTile
          label={t("stalker.weatherTitle")}
          value={
            <>
              <span className="mr-1" aria-hidden>
                {WEATHER_ICONS[weather.kind]}
              </span>
              {t(`stalker.weather.${weather.kind}` as TranslationKey)}
            </>
          }
          hint={t("stalker.successRate", {
            pct: Math.round(weather.successRate * 100),
          })}
        />
        <StatTile
          label={t("stalker.context")}
          value={`${Math.round(context * 100)}%`}
          hint={t("stalker.contextHint", { count: toolUses })}
        >
          <Meter value={context} warn={context >= CONTEXT_WARN} />
        </StatTile>
        <StatTile
          label={t("stalker.todos")}
          value={todos.length > 0 ? `${todosDone}/${todos.length}` : "—"}
          hint={
            todos.length > 0
              ? t("stalker.todosInProgress", { count: todosActive })
              : t("stalker.todosNone")
          }
        >
          {todos.length > 0 && <Meter value={todosDone / todos.length} />}
        </StatTile>
      </div>
    </section>
  );
}
