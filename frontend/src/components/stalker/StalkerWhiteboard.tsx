"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useGameStore, selectWhiteboardData } from "@/stores/gameStore";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/i18n";
import type { AgentLifespan, KanbanTask } from "@/types";
import { parseServerTime } from "@/utils/serverTime";

type Mode = "tools" | "heatmap" | "kanban" | "timeline";

const MODES: { id: Mode; label: TranslationKey; icon: string }[] = [
  { id: "tools", label: "stalker.wb.tools", icon: "🍕" },
  { id: "heatmap", label: "stalker.wb.heatmap", icon: "🔥" },
  { id: "kanban", label: "stalker.wb.kanban", icon: "📌" },
  { id: "timeline", label: "stalker.wb.timeline", icon: "📅" },
];

/** Muted categorical palette for the tool donut (rest folds into "other"). */
const SLICE_COLORS = ["#0d9488", "#38bdf8", "#f59e0b", "#a78bfa", "#f472b6", "#94a3b8"];
const MAX_SLICES = 5;
const MAX_FILES = 10;

function Empty({ label }: { label: TranslationKey }): ReactNode {
  const { t } = useTranslation();
  return <p className="py-10 text-center text-xs text-slate-400">{t(label)}</p>;
}

function ToolDonut({ usage }: { usage: Record<string, number> }): ReactNode {
  const { t } = useTranslation();
  const sorted = Object.entries(usage).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) {
    return <Empty label="stalker.wb.toolsEmpty" />;
  }
  const head = sorted.slice(0, MAX_SLICES);
  const restCount = sorted.slice(MAX_SLICES).reduce((sum, [, n]) => sum + n, 0);
  const slices = restCount > 0 ? [...head, ["…", restCount] as [string, number]] : head;

  const r = 42;
  const circumference = 2 * Math.PI * r;
  const lengths = slices.map(([, n]) => (n / total) * circumference);
  const offsets = lengths.map((_, i) =>
    lengths.slice(0, i).reduce((sum, len) => sum + len, 0),
  );

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0 -rotate-90" aria-hidden>
        {slices.map(([name], i) => (
          <circle
            key={name}
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={SLICE_COLORS[i]}
            strokeWidth="20"
            strokeDasharray={`${lengths[i]} ${circumference - lengths[i]}`}
            strokeDashoffset={-offsets[i]}
          />
        ))}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1">
        {slices.map(([name, n], i) => (
          <li key={name} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: SLICE_COLORS[i] }} />
            <span className="truncate font-mono text-slate-700">{name}</span>
            <span className="ml-auto shrink-0 tabular-nums text-slate-400">
              {t("stalker.wb.calls", { count: n })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FileHeatmap({ edits }: { edits: Record<string, number> }): ReactNode {
  const { t } = useTranslation();
  const sorted = Object.entries(edits).sort((a, b) => b[1] - a[1]).slice(0, MAX_FILES);
  if (sorted.length === 0) {
    return <Empty label="stalker.wb.heatmapEmpty" />;
  }
  const max = sorted[0][1];
  return (
    <ul className="space-y-1">
      {sorted.map(([path, n]) => {
        const heat = n / max;
        return (
          <li key={path} className="relative overflow-hidden rounded-md px-2 py-1 text-xs">
            <span
              className="absolute inset-y-0 left-0 rounded-md bg-amber-300"
              style={{ width: `${Math.max(6, heat * 100)}%`, opacity: 0.2 + heat * 0.3 }}
              aria-hidden
            />
            <span className="relative flex items-center gap-2">
              <span className="truncate font-mono text-slate-700" title={path}>
                {path.split("/").slice(-2).join("/")}
              </span>
              <span className="ml-auto shrink-0 tabular-nums text-slate-500">
                {t("stalker.wb.edits", { count: n })}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const KANBAN_COLUMNS: { status: string; label: TranslationKey; dot: string }[] = [
  { status: "pending", label: "stalker.wb.todo", dot: "bg-slate-300" },
  { status: "in_progress", label: "stalker.wb.doing", dot: "bg-teal-500" },
  { status: "completed", label: "stalker.wb.done", dot: "bg-slate-500" },
];

function Kanban({ tasks }: { tasks: KanbanTask[] }): ReactNode {
  const { t } = useTranslation();
  if (tasks.length === 0) {
    return <Empty label="stalker.wb.kanbanEmpty" />;
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {KANBAN_COLUMNS.map((col) => {
        const items = tasks.filter((task) => task.status === col.status);
        return (
          <div key={col.status} className="min-w-0 rounded-xl bg-slate-50 p-2">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
              <span className={`h-2 w-2 rounded-full ${col.dot}`} aria-hidden />
              {t(col.label)}
              <span className="ml-auto font-normal text-slate-400">{items.length}</span>
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {items.map((task) => (
                <li
                  key={task.taskId}
                  className="rounded-lg border border-slate-200/70 bg-white px-2 py-1.5 text-[11px] leading-snug text-slate-700 shadow-sm"
                >
                  {task.subject}
                  {task.assignee && <span className="mt-0.5 block text-[10px] text-slate-400">{task.assignee}</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function Timeline({ lifespans, now }: { lifespans: AgentLifespan[]; now: number }): ReactNode {
  const { t } = useTranslation();
  if (lifespans.length === 0) {
    return <Empty label="stalker.wb.timelineEmpty" />;
  }
  const spans = lifespans.map((l) => ({
    ...l,
    start: parseServerTime(l.startTime).getTime(),
    end: l.endTime ? parseServerTime(l.endTime).getTime() : now,
  }));
  const min = Math.min(...spans.map((s) => s.start));
  const range = Math.max(1, Math.max(...spans.map((s) => s.end)) - min);

  return (
    <ul className="space-y-1.5">
      {spans.map((span) => (
        <li key={span.agentId} className="grid grid-cols-[7rem_1fr] items-center gap-2 text-[11px]">
          <span className="truncate text-slate-600" title={span.agentName}>
            {span.agentName}
          </span>
          <span className="relative h-3 rounded-full bg-slate-100">
            <span
              className={`absolute inset-y-0 rounded-full ${span.endTime ? "" : "animate-pulse"}`}
              style={{
                left: `${((span.start - min) / range) * 100}%`,
                width: `${Math.max(2, ((span.end - span.start) / range) * 100)}%`,
                background: span.color,
              }}
              title={span.endTime ? undefined : t("stalker.wb.stillWorking")}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

interface StalkerWhiteboardProps {
  onClose: () => void;
}

/** Floating board opened from the meeting-room whiteboard on the map. */
export function StalkerWhiteboard({ onClose }: StalkerWhiteboardProps): ReactNode {
  const { t } = useTranslation();
  const data = useGameStore(selectWhiteboardData);
  const [mode, setMode] = useState<Mode>("tools");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label={t("stalker.whiteboard")}
      className="absolute left-4 top-24 z-30 w-[min(440px,calc(100%-2rem))] rounded-2xl border border-slate-200/80 bg-white/97 p-3 shadow-xl backdrop-blur"
    >
      <header className="mb-2 flex items-center gap-2 px-1">
        <h2 className="text-sm font-bold text-slate-800">📋 {t("stalker.whiteboard")}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("modal.close")}
          className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={16} />
        </button>
      </header>
      <div role="tablist" className="mb-3 flex gap-0.5 rounded-xl bg-slate-100 p-0.5">
        {MODES.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={`flex-1 rounded-[10px] py-1 text-xs font-semibold transition-colors ${
              mode === id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="mr-1" aria-hidden>
              {icon}
            </span>
            {t(label)}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="max-h-[52vh] overflow-y-auto px-1">
        {mode === "tools" && <ToolDonut usage={data.toolUsage ?? {}} />}
        {mode === "heatmap" && <FileHeatmap edits={data.fileEdits ?? {}} />}
        {mode === "kanban" && <Kanban tasks={data.kanbanTasks ?? []} />}
        {mode === "timeline" && <Timeline lifespans={data.agentLifespans ?? []} now={now} />}
      </div>
    </div>
  );
}
