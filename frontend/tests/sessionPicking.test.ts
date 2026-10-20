import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/api", () => ({ apiFetch: vi.fn() }));

import { pickInitialSession, type Session } from "../src/hooks/useSessions";
import { parseServerTime } from "../src/utils/serverTime";

function session(id: string, updatedAt: string, eventCount: number, status = "active"): Session {
  return {
    id, updatedAt, eventCount, status,
    label: null, displayName: null, projectName: null, projectRoot: null,
    createdAt: updatedAt, floorId: null, roomId: null,
  };
}

describe("pickInitialSession", () => {
  it("prefers the most recently updated session over the biggest one", () => {
    const old = session("old", "2026-10-20T06:39:00Z", 645);
    const live = session("live", "2026-10-20T07:12:00Z", 178);
    expect(pickInitialSession([old, live])?.id).toBe("live");
  });

  it("skips tiny child sessions when a real one exists", () => {
    const child = session("child", "2026-10-20T07:20:00Z", 2);
    const main = session("main", "2026-10-20T07:12:00Z", 178);
    expect(pickInitialSession([child, main])?.id).toBe("main");
  });

  it("falls back to inactive sessions when nothing is active", () => {
    const done = session("done", "2026-10-20T07:00:00Z", 50, "completed");
    expect(pickInitialSession([done])?.id).toBe("done");
  });
});

describe("parseServerTime", () => {
  it("reads offset-less backend timestamps as UTC", () => {
    expect(parseServerTime("2026-10-20T06:27:27.149679").toISOString()).toBe("2026-10-20T06:27:27.149Z");
  });

  it("keeps explicit offsets", () => {
    expect(parseServerTime("2026-10-20T06:27:27+09:00").toISOString()).toBe("2026-10-19T21:27:27.000Z");
  });
});
