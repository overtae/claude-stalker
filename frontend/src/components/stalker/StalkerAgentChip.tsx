"use client";

import type { ReactNode } from "react";
import { AGENT_BRANDS, toAgentSource } from "@/utils/agentBrand";

/**
 * Small "◆ Cursor"-style tag for sessions that don't come from Claude Code.
 * Claude sessions are the default and get no tag, so the UI stays quiet.
 */
export function StalkerAgentChip({
  source,
}: {
  source: string | undefined;
}): ReactNode {
  const brand = AGENT_BRANDS[toAgentSource(source)];
  if (brand.source === "claude" || brand.name === null) {
    return null;
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white dark:bg-neutral-200 dark:text-neutral-900">
      <span aria-hidden>{brand.icon}</span>
      {brand.name}
    </span>
  );
}
