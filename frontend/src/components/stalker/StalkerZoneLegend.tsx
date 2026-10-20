"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  const [open, setOpen] = useState(true);

  return (
    <section className="shrink-0 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm dark:border-neutral-700/70 dark:bg-neutral-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={
          open ? t("stalker.legend.collapse") : t("stalker.legend.expand")
        }
        className="flex w-full items-center justify-between gap-2 px-1 text-left cursor-pointer"
      >
        <h2 className="text-sm font-bold text-slate-800 dark:text-neutral-100">
          {t("stalker.legend")}
        </h2>
        {open ? (
          <ChevronDown
            size={16}
            className="shrink-0 text-slate-500"
            aria-hidden
          />
        ) : (
          <ChevronUp
            size={16}
            className="shrink-0 text-slate-500"
            aria-hidden
          />
        )}
      </button>
      {open && (
        <ul className="space-y-1 px-1 pt-2">
          {LEGEND_ITEMS.map((item) => (
            <li key={item.zoneKey} className="flex items-center gap-2 text-xs">
              <span className="w-4 shrink-0 text-center" aria-hidden>
                {item.icon}
              </span>
              <span className="w-16 shrink-0 font-semibold text-slate-700 dark:text-neutral-200">
                {t(item.zoneKey)}
              </span>
              <span className="truncate text-slate-500 dark:text-neutral-400">
                {t(item.hintKey)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
