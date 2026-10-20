"use client";

/**
 * B안 컨셉: 왼쪽 백화점식 층 안내 (HTML 오버레이 — Pixi 위에 항상 보임)
 */
export function StalkerFloorDirectory() {
  const floors = [
    { label: "3F · claude-stalker", active: true },
    { label: "2F · (세션 없음)", active: false },
    { label: "1F · (dark)", active: false },
  ];

  return (
    <div
      className="pointer-events-none absolute bottom-4 left-4 z-20 w-[88px] rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-lg"
      aria-label="층별 안내"
    >
      <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        Building
      </p>
      <ul className="space-y-1.5 text-[11px]">
        {floors.map((f) => (
          <li
            key={f.label}
            className={
              f.active ? "font-semibold text-teal-700" : "text-slate-400"
            }
          >
            {f.active ? "● " : ""}
            {f.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
