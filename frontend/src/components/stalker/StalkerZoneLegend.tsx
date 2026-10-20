"use client";

import type { ReactNode } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/i18n";

const LEGEND_ITEMS: {
  zoneKey: TranslationKey;
  hintKey: TranslationKey;
  icon: string;
}[] = [
  { zoneKey: "zones.archive", hintKey: "stalker.legend.archive", icon: "📚" },
  { zoneKey: "zones.dev", hintKey: "stalker.legend.dev", icon: "💻" },
  { zoneKey: "zones.server", hintKey: "stalker.legend.server", icon: "🗄️" },
  { zoneKey: "zones.research", hintKey: "stalker.legend.research", icon: "🌐" },
  { zoneKey: "zones.meeting", hintKey: "stalker.legend.meeting", icon: "🗒️" },
  {
    zoneKey: "zones.user_desk",
    hintKey: "stalker.legend.user_desk",
    icon: "🙋",
  },
  { zoneKey: "zones.elevator", hintKey: "stalker.legend.elevator", icon: "🛗" },
];

export function StalkerZoneLegend(): ReactNode {
  const { t } = useTranslation();

  return (
    <section className="shrink-0 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm">
      <h2 className="px-1 pb-2 text-sm font-bold text-slate-800">
        {t("stalker.legend")}
      </h2>
      <ul className="space-y-1 px-1">
        {LEGEND_ITEMS.map((item) => (
          <li key={item.zoneKey} className="flex items-center gap-2 text-xs">
            <span className="w-4 shrink-0 text-center" aria-hidden>
              {item.icon}
            </span>
            <span className="w-16 shrink-0 font-semibold text-slate-700">
              {t(item.zoneKey)}
            </span>
            <span className="truncate text-slate-500">{t(item.hintKey)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
