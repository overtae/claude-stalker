"use client";

import { useGameStore } from "@/stores/gameStore";
import { COWBOY_ZONE_ANCHORS, type CowboyZoneKey } from "@/systems/cowboyZones";

function isCowboyZoneKey(value: string | null): value is CowboyZoneKey {
  return value !== null && value in COWBOY_ZONE_ANCHORS;
}

export function StalkerZoneHud() {
  const activityZone = useGameStore((s) => s.activityZone);
  const activityZoneLabel = useGameStore((s) => s.activityZoneLabel);
  const serverRackPulse = useGameStore((s) => s.serverRackPulse);

  const zoneKey = isCowboyZoneKey(activityZone) ? activityZone : null;
  const anchor = zoneKey ? COWBOY_ZONE_ANCHORS[zoneKey] : null;
  const label = activityZoneLabel ?? anchor?.label;

  if (!label && !serverRackPulse) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[220px] flex-col gap-2"
      aria-live="polite"
    >
      {label && (
        <div className="stalker-zone-pill rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-teal-700/80">
            Claude Stalker
          </p>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
        </div>
      )}
      {serverRackPulse && (
        <div className="stalker-rack-pulse flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/95 px-3 py-1.5 text-xs text-rose-800">
          <span className="inline-flex gap-1">
            <span className="h-2 w-2 rounded-sm bg-rose-400" />
            <span className="h-2 w-2 rounded-sm bg-orange-400" />
            <span className="h-2 w-2 rounded-sm bg-rose-400" />
          </span>
          서버실 랙 가동 중
        </div>
      )}
    </div>
  );
}
