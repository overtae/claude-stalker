"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Building2, Pin, RefreshCw } from "lucide-react";
import type { Session } from "@/hooks/useSessions";
import { useTranslation } from "@/hooks/useTranslation";
import {
  usePreferencesStore,
  selectAutoFollowNewSessions,
} from "@/stores/preferencesStore";
import {
  formatAgo,
  isRecentlyActive,
  sessionTitle,
  type OfficeFloor,
} from "@/utils/stalkerFormat";

/** Floors quiet for longer than this fold under "show idle floors". */
const IDLE_FLOOR_MS = 24 * 60 * 60 * 1000;
const MIN_VISIBLE_FLOORS = 4;

export interface StalkerLeftRailProps {
  floors: OfficeFloor[];
  activeFloorKey: string | null;
  /** Building name from settings; shown instead of the generic tag. */
  buildingName: string | null;
  sessionsLoading: boolean;
  sessionId: string;
  now: number;
  onSessionSelect: (id: string) => Promise<void>;
}

function splitFloors(
  floors: OfficeFloor[],
  activeKey: string | null,
  now: number,
): { visible: OfficeFloor[]; idle: OfficeFloor[] } {
  const byRecency = [...floors].sort((a, b) =>
    (b.lastUpdated ?? "").localeCompare(a.lastUpdated ?? ""),
  );
  const keep = new Set(
    byRecency
      .filter(
        (f, i) =>
          f.key === activeKey ||
          // floors you set up in settings always stay on the board
          f.isConfigured ||
          i < MIN_VISIBLE_FLOORS ||
          (f.lastUpdated !== null &&
            now - new Date(f.lastUpdated).getTime() < IDLE_FLOOR_MS),
      )
      .map((f) => f.key),
  );
  const byFloorDesc = [...floors].sort((a, b) => b.floor - a.floor);
  return {
    visible: byFloorDesc.filter((f) => keep.has(f.key)),
    idle: byFloorDesc.filter((f) => !keep.has(f.key)),
  };
}

export function StalkerLeftRail({
  floors,
  activeFloorKey,
  buildingName,
  sessionsLoading,
  sessionId,
  now,
  onSessionSelect,
}: StalkerLeftRailProps): ReactNode {
  const { t } = useTranslation();
  const [showIdle, setShowIdle] = useState(false);
  const { visible, idle } = useMemo(
    () => splitFloors(floors, activeFloorKey, now),
    [floors, activeFloorKey, now],
  );
  const shown = showIdle ? [...visible, ...idle] : visible;

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col md:flex">
      <div className="flex items-center justify-between px-1 pb-2 pt-1">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <Building2 size={16} className="text-slate-500" aria-hidden />
          {t("stalker.floorGuide")}
        </h2>
        <span className="max-w-[45%] truncate text-[9px] font-bold tracking-[0.18em] text-slate-400">
          {buildingName ?? t("stalker.floorGuideTag")}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-2 pr-0.5">
        {sessionsLoading && floors.length === 0 && (
          <p className="px-2 text-xs text-slate-500">
            {t("stalker.sessionsLoading")}
          </p>
        )}
        {!sessionsLoading && floors.length === 0 && (
          <p className="px-2 text-xs leading-relaxed text-slate-500">
            {t("stalker.sessionsEmpty")}
          </p>
        )}
        {shown.map((floor) =>
          floor.key === activeFloorKey ? (
            <ActiveFloorCard
              key={floor.key}
              floor={floor}
              sessionId={sessionId}
              now={now}
              onSessionSelect={onSessionSelect}
            />
          ) : (
            <FloorCard
              key={floor.key}
              floor={floor}
              now={now}
              onSelect={
                floor.sessions[0]
                  ? () => void onSessionSelect(floor.sessions[0].id)
                  : undefined
              }
            />
          ),
        )}
        {idle.length > 0 && (
          <button
            type="button"
            onClick={() => setShowIdle((v) => !v)}
            className="w-full rounded-lg py-2 text-center text-xs font-medium text-slate-500 hover:bg-white/70 hover:text-slate-700"
          >
            {showIdle
              ? t("stalker.fewerFloors")
              : t("stalker.moreFloors", { count: idle.length })}
          </button>
        )}
      </div>
    </aside>
  );
}

function FloorHeader({
  floor,
  now,
  isActive,
}: {
  floor: OfficeFloor;
  now: number;
  isActive: boolean;
}): ReactNode {
  const { t } = useTranslation();
  const live =
    floor.lastUpdated !== null && isRecentlyActive(floor.lastUpdated, now);
  const when =
    floor.lastUpdated === null
      ? null
      : live
        ? t("stalker.activeNow")
        : formatAgo(t, floor.lastUpdated, now);

  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${
          isActive ? "text-white" : "bg-slate-100 text-slate-500"
        }`}
        // a floor's accent from the building settings colours its active badge
        style={isActive ? { background: floor.accent ?? "#1e293b" } : undefined}
      >
        {floor.floor}F
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-800">
          {floor.icon && (
            <span className="mr-1" aria-hidden>
              {floor.icon}
            </span>
          )}
          {floor.name}
        </span>
        <span className="block truncate text-[11px] text-slate-500">
          {floor.sessions.length === 0
            ? t("stalker.floorEmpty")
            : `${t("stalker.floorSessions", { count: floor.sessions.length })} · ${when}`}
        </span>
      </span>
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${live ? "bg-emerald-500" : "bg-slate-300"}`}
        aria-hidden
      />
    </div>
  );
}

function FloorCard({
  floor,
  now,
  onSelect,
}: {
  floor: OfficeFloor;
  now: number;
  /** Undefined for a configured floor that has no sessions yet. */
  onSelect?: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      className="w-full rounded-2xl border border-slate-200/70 bg-white px-3 py-2.5 text-left shadow-sm transition enabled:hover:-translate-y-px enabled:hover:border-slate-300 enabled:hover:shadow disabled:cursor-default disabled:opacity-70"
    >
      <FloorHeader floor={floor} now={now} isActive={false} />
    </button>
  );
}

function ActiveFloorCard({
  floor,
  sessionId,
  now,
  onSessionSelect,
}: {
  floor: OfficeFloor;
  sessionId: string;
  now: number;
  onSessionSelect: (id: string) => Promise<void>;
}): ReactNode {
  const { t } = useTranslation();
  const autoFollow = usePreferencesStore(selectAutoFollowNewSessions);
  const setAutoFollow = usePreferencesStore((s) => s.setAutoFollowNewSessions);
  const current = floor.sessions.find((s) => s.id === sessionId);
  const others = floor.sessions.filter((s) => s.id !== sessionId);

  return (
    <div className="rounded-2xl border border-claude-300/80 bg-white px-3 py-2.5 shadow-sm ring-2 ring-claude-100">
      <FloorHeader floor={floor} now={now} isActive={true} />
      <div className="mt-2.5 border-t border-slate-100 pt-2">
        <button
          type="button"
          onClick={() => void setAutoFollow(!autoFollow)}
          aria-pressed={autoFollow}
          className={`flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-xs transition-colors ${
            autoFollow
              ? "text-claude-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <RefreshCw
            size={13}
            className={autoFollow ? "text-claude-500" : "text-slate-400"}
            aria-hidden
          />
          {t("stalker.autoFollow")}
        </button>

        <ul className="mt-1 max-h-[42vh] space-y-0.5 overflow-y-auto">
          {current && (
            <SessionRow
              session={current}
              now={now}
              isCurrent={true}
              onSelect={() => undefined}
            />
          )}
          {others.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              now={now}
              isCurrent={false}
              onSelect={() => void onSessionSelect(session.id)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function SessionRow({
  session,
  now,
  isCurrent,
  onSelect,
}: {
  session: Session;
  now: number;
  isCurrent: boolean;
  onSelect: () => void;
}): ReactNode {
  const { t } = useTranslation();
  const live = isRecentlyActive(session.updatedAt, now);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isCurrent ? "true" : undefined}
        className={`flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-left text-xs transition-colors ${
          isCurrent
            ? "bg-slate-100 font-semibold text-slate-800"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {isCurrent && (
          <Pin
            size={12}
            className="shrink-0 rotate-45 text-claude-600"
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1 truncate">
          {sessionTitle(t, session)}
        </span>
        <span
          className={`shrink-0 text-[10px] ${
            live && isCurrent
              ? "font-semibold text-claude-600"
              : "text-slate-400"
          }`}
        >
          {live && isCurrent
            ? t("stalker.activeNow")
            : formatAgo(t, session.updatedAt, now)}
        </span>
      </button>
    </li>
  );
}
