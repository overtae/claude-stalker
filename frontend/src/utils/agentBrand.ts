import { CLAUDE_COLOR } from "@/utils/stalkerFormat";

/** Coding agents whose sessions can show up in the office. */
export type AgentSource = "claude" | "cursor" | "codex" | "opencode";

export interface AgentBrand {
  source: AgentSource;
  /** Display name; null = translated "Claude". */
  name: string | null;
  color: number;
  /** Glyph for avatars and the map badge. */
  icon: string;
}

export const AGENT_BRANDS: Record<AgentSource, AgentBrand> = {
  claude: { source: "claude", name: null, color: CLAUDE_COLOR, icon: "✳" },
  cursor: { source: "cursor", name: "Cursor", color: 0x3f3f46, icon: "◆" },
  codex: { source: "codex", name: "Codex", color: 0x4f6bed, icon: "❯" },
  opencode: {
    source: "opencode",
    name: "OpenCode",
    color: 0x2f6f73,
    icon: "◎",
  },
};

export function toAgentSource(value: string | null | undefined): AgentSource {
  return value === "cursor" || value === "codex" || value === "opencode"
    ? value
    : "claude";
}
