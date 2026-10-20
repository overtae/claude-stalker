import type { Session } from "@/hooks/useSessions";
import type { TranslationKey } from "@/i18n";

type Translate = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

/** Claude's own colour — reserved, never handed to subagents. */
export const CLAUDE_COLOR = 0xd97757;

const AGENT_PALETTE = [
  0x60a5fa, 0x34d399, 0xa78bfa, 0xf472b6, 0xfbbf24, 0x22d3ee, 0xf87171,
  0x818cf8, 0xa3e635, 0x2dd4bf,
];

/** Distinct colour per subagent, stable for its lifetime (by agent number). */
export function agentColor(agentNumber: number): number {
  const index = Math.abs(agentNumber - 1) % AGENT_PALETTE.length;
  return AGENT_PALETTE[index];
}

export function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Sessions touched within this window count as "active now". */
export const ACTIVE_WINDOW_MS = 2 * MINUTE;

export function formatAgo(t: Translate, iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  if (diff < MINUTE) {
    return t("time.justNow");
  }
  if (diff < HOUR) {
    return t("time.minutesAgo", { count: Math.floor(diff / MINUTE) });
  }
  if (diff < DAY) {
    return t("time.hoursAgo", { count: Math.floor(diff / HOUR) });
  }
  return t("time.daysAgo", { count: Math.floor(diff / DAY) });
}

export function isRecentlyActive(iso: string, now: number): boolean {
  return now - new Date(iso).getTime() < ACTIVE_WINDOW_MS;
}

/** Claude Code names its project dirs `-Users-me-dev-x`; that's not a title. */
const ENCODED_PATH = /^-?(Users|home)-/;

function isRealTitle(value: string | null, session: Session): value is string {
  return (
    !!value?.trim() &&
    value !== session.projectName &&
    !ENCODED_PATH.test(value)
  );
}

export function sessionTitle(t: Translate, session: Session): string {
  if (isRealTitle(session.displayName, session)) {
    return session.displayName;
  }
  if (isRealTitle(session.label, session)) {
    return session.label;
  }
  return t("stalker.untitledSession", { id: session.id.slice(0, 8) });
}

export function projectKey(session: Session): string {
  return session.projectRoot ?? session.projectName ?? "__unknown__";
}

export function projectName(t: Translate, session: Session): string {
  return (
    session.projectRoot?.split("/").filter(Boolean).pop() ??
    session.projectName ??
    t("sessions.unknownProject")
  );
}

/** `/Users/me/dev/x` → `~/dev/x` for compact display. */
export function shortenPath(path: string): string {
  return path.replace(/^\/(Users|home)\/[^/]+/, "~");
}

export interface OfficeFloor {
  key: string;
  floor: number;
  name: string;
  sessions: Session[];
  lastUpdated: string;
}

/**
 * Each project is one floor. Floor numbers follow when the project first
 * appeared (oldest = 1F) so they stay put as sessions come and go.
 */
export function buildFloors(t: Translate, sessions: Session[]): OfficeFloor[] {
  const groups = new Map<string, Session[]>();
  for (const session of sessions) {
    const key = projectKey(session);
    groups.set(key, [...(groups.get(key) ?? []), session]);
  }

  const byAge = [...groups.entries()]
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      );
      const firstSeen = list.reduce(
        (min, s) => (s.createdAt < min ? s.createdAt : min),
        list[0].createdAt,
      );
      return { key, sorted, firstSeen };
    })
    .sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));

  return byAge.map(({ key, sorted }, i) => ({
    key,
    floor: i + 1,
    name: projectName(t, sorted[0]),
    sessions: sorted,
    lastUpdated: sorted[0].updatedAt,
  }));
}
