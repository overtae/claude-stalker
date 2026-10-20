"use client";

import type { ReactNode } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useGameStore, selectIsConnected } from "@/stores/gameStore";
import { sessionTitle, type OfficeFloor } from "@/utils/stalkerFormat";
import type { Session } from "@/hooks/useSessions";

interface StalkerMapHeaderProps {
  floor: OfficeFloor | null;
  session: Session | null;
}

/** Floating project card (top-left) and connection pill (top-right) over the map. */
export function StalkerMapHeader({
  floor,
  session,
}: StalkerMapHeaderProps): ReactNode {
  const { t } = useTranslation();
  const isConnected = useGameStore(selectIsConnected);
  const zoneLabel = useGameStore((s) => s.activityZoneLabel);

  return (
    <>
      {floor && (
        <div className="pointer-events-none absolute left-4 top-4 z-20 flex max-w-[min(420px,calc(100%-9rem))] items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/95 py-2.5 pl-2.5 pr-4 shadow-sm backdrop-blur">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d97757] text-xl font-bold text-white"
            aria-hidden
          >
            ✳
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                {floor.floor}F
              </span>
              <span className="truncate text-sm font-bold text-slate-800">
                {floor.name}
              </span>
            </div>
            <p className="truncate text-xs text-slate-500">
              {session ? sessionTitle(t, session) : "—"}
              {zoneLabel && (
                <span className="font-semibold text-claude-600">
                  {" "}
                  · {t("stalker.nowIn", { zone: zoneLabel })}
                </span>
              )}
            </p>
          </div>
        </div>
      )}
      <span
        className={`pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full border bg-white/95 px-3 py-1.5 text-xs font-extrabold shadow-sm backdrop-blur ${
          isConnected
            ? "border-emerald-200 text-emerald-700"
            : "border-slate-200 text-slate-500"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${isConnected ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`}
          aria-hidden
        />
        {isConnected
          ? t("stalker.live")
          : session
            ? t("stalker.disconnected")
            : t("stalker.waiting")}
      </span>
    </>
  );
}
