"use client";

import type { ReactNode } from "react";
import { useGameStore, selectConversation } from "@/stores/gameStore";
import { useTranslation } from "@/hooks/useTranslation";
import type { ConversationEntry } from "@/types";

/** Long assistant replies are clipped; the full text lives in the transcript. */
const MAX_LINES_CLASS = "line-clamp-6";

function Message({ entry }: { entry: ConversationEntry }): ReactNode {
  const { t } = useTranslation();

  if (entry.role === "thinking") {
    return (
      <li
        className={`px-1 text-[11px] italic leading-snug text-slate-400 ${MAX_LINES_CLASS}`}
      >
        {entry.text}
      </li>
    );
  }

  const isUser = entry.role === "user";
  return (
    <li className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
          isUser
            ? "rounded-tr-md bg-claude-600 text-white"
            : "rounded-tl-md bg-slate-100 text-slate-700"
        }`}
      >
        <p className="mb-0.5 text-[10px] font-bold opacity-70">
          {isUser ? t("stalker.you.said") : t("stalker.claude")}
        </p>
        <p className={`whitespace-pre-wrap break-words ${MAX_LINES_CLASS}`}>
          {entry.text}
        </p>
      </div>
    </li>
  );
}

/** Chat tab body: user prompts, Claude replies and tool calls. */
export function StalkerConversationList(): ReactNode {
  const { t } = useTranslation();
  // Tool calls already stream through the activity tab — keep chat readable.
  const conversation = useGameStore(selectConversation).filter(
    (entry) => entry.role !== "tool",
  );

  if (conversation.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-xs text-slate-400">
        {t("stalker.conversationEmpty")}
      </p>
    );
  }

  // newest at the top, like the activity tab
  return (
    <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto py-1">
      {[...conversation].reverse().map((entry) => (
        <Message key={entry.id} entry={entry} />
      ))}
    </ol>
  );
}
