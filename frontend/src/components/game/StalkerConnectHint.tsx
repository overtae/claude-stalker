"use client";

import { useGameStore, selectIsConnected } from "@/stores/gameStore";

export function StalkerConnectHint() {
  const isConnected = useGameStore(selectIsConnected);

  if (isConnected) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute right-3 top-14 z-20 max-w-[240px] rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs text-amber-950 shadow-md">
      <p className="font-semibold">연결 대기 중</p>
      <p className="mt-1 leading-snug text-amber-900/90">
        Claude Code 세션이 없으면 왼쪽 Sessions가 비어 있습니다. 상단{" "}
        <strong>More → Simulate</strong>로 B맵·에이전트를 먼저 확인하세요.
      </p>
    </div>
  );
}
