"use client";

import { useState, type ReactNode } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/i18n";
import { StalkerActivityList } from "@/components/stalker/StalkerActivityList";
import { StalkerConversationList } from "@/components/stalker/StalkerConversationList";
import { StalkerGitList } from "@/components/stalker/StalkerGitList";

type Tab = "activity" | "conversation" | "git";

const TABS: { id: Tab; label: TranslationKey }[] = [
  { id: "activity", label: "stalker.tab.activity" },
  { id: "conversation", label: "stalker.tab.conversation" },
  { id: "git", label: "stalker.tab.git" },
];

/** Right-rail card switching between activity log, chat and git. */
export function StalkerInfoTabs(): ReactNode {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("activity");

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm dark:border-neutral-700/70 dark:bg-neutral-900">
      <div
        role="tablist"
        className="mb-1.5 flex gap-0.5 rounded-xl bg-slate-100 p-0.5 dark:bg-neutral-800"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex-1 cursor-pointer rounded-[10px] py-1 text-xs font-semibold transition-colors ${
              tab === id
                ? "bg-white text-slate-800 shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
                : "text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="flex min-h-0 flex-1 flex-col">
        {tab === "activity" && <StalkerActivityList />}
        {tab === "conversation" && <StalkerConversationList />}
        {tab === "git" && <StalkerGitList />}
      </div>
    </section>
  );
}
