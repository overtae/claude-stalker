import { describe, expect, it } from "vitest";
import { buildFloors } from "../src/utils/stalkerFormat";
import type { Session } from "../src/hooks/useSessions";
import type { BuildingConfig } from "../src/types/navigation";

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

function session(id: string, root: string, updatedAt: string): Session {
  return {
    id,
    updatedAt,
    createdAt: updatedAt,
    projectRoot: root,
    projectName: null,
    label: null,
    displayName: null,
    status: "active",
    eventCount: 10,
    floorId: null,
    roomId: null,
  };
}

const sessions = [
  session("a", "/Users/me/dev/api", "2026-10-20T07:00:00Z"),
  session("b", "/Users/me/dev/web", "2026-10-20T06:00:00Z"),
  session("c", "/Users/me/dev/api", "2026-10-20T08:00:00Z"),
];

describe("buildFloors", () => {
  it("makes one auto floor per project, numbered by first appearance", () => {
    const floors = buildFloors(t, sessions);
    expect(floors.map((f) => [f.floor, f.name])).toEqual([
      [1, "web"],
      [2, "api"],
    ]);
    expect(floors[1].sessions.map((s) => s.id)).toEqual(["c", "a"]);
  });

  it("puts configured floors first and numbers auto floors above them", () => {
    const config: BuildingConfig = {
      buildingName: "HQ",
      floors: [
        {
          id: "f1",
          name: "Backend",
          floorNumber: 3,
          accent: "#d97757",
          icon: "🛠️",
          rooms: [{ id: "r", repoName: "api" }],
        },
        {
          id: "f2",
          name: "Empty",
          floorNumber: 5,
          accent: "#000",
          icon: "🌱",
          rooms: [],
        },
      ],
    };
    const floors = buildFloors(t, sessions, config);

    expect(floors[0]).toMatchObject({
      floor: 3,
      name: "Backend",
      isConfigured: true,
      icon: "🛠️",
    });
    expect(floors[0].sessions.map((s) => s.id)).toEqual(["c", "a"]);
    expect(floors[1]).toMatchObject({
      floor: 5,
      isConfigured: true,
      lastUpdated: null,
    });
    expect(floors[1].sessions).toEqual([]);
    expect(floors[2]).toMatchObject({
      floor: 6,
      name: "web",
      isConfigured: false,
    });
  });
});
