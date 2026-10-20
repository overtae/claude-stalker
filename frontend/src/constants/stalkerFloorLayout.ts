import type { CowboyZoneKey } from "@/systems/cowboyZones";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/constants/canvas";
import type { TranslationKey } from "@/i18n";
import {
  TILE_H,
  TILE_W,
  footprintBase,
  footprintDepth,
  gridToScreen,
  type Footprint,
  type GridRegion,
  type IsoPoint,
} from "@/systems/stalkerIsoCoords";

const B = "/assets/buggy";

/**
 * Floor plan (grid units, +col = "\" down-right, +row = "/" down-left):
 *
 *   row 0-4   archive | dev   | server
 *   row 5-9   meeting | lobby | research
 *   row 10-13 elev | cafe | my desk | lounge
 *
 * Back walls run along row=0 and col=0; the front is open (cutaway).
 */
export const GRID_COLS = 20;
export const GRID_ROWS = 14;

export const WALL_HEIGHT = 150;
export const WALL_THICKNESS = 0.3;
export const FLOOR_SLAB = 16;

const MAP_HEIGHT = WALL_HEIGHT + (GRID_COLS + GRID_ROWS) * (TILE_H / 2) + FLOOR_SLAB;

export const ISO_ORIGIN: IsoPoint = {
  x: CANVAS_WIDTH / 2 - ((GRID_COLS - GRID_ROWS) * TILE_W) / 4,
  y: (CANVAS_HEIGHT - MAP_HEIGHT) / 2 + WALL_HEIGHT,
};

export function toScreen(col: number, row: number): IsoPoint {
  return gridToScreen(col, row, ISO_ORIGIN);
}

export type StalkerLayoutZone =
  Exclude<CowboyZoneKey, "boss_desk"> | "elevator" | "lobby";

type DecorRoom = "cafe" | "lounge";

export type ZoneLabelKey = Extract<
  TranslationKey,
  | "zones.lobby"
  | "zones.elevator"
  | "zones.archive"
  | "zones.dev"
  | "zones.server"
  | "zones.research"
  | "zones.meeting"
  | "zones.user_desk"
>;

export interface OfficeRoom {
  id: StalkerLayoutZone | DecorRoom;
  /** Inclusive cell range. */
  region: GridRegion;
  floor: number;
  floorAlt: number;
  label?: { key: ZoneLabelKey; icon: string };
}

export const OFFICE_ROOMS: OfficeRoom[] = [
  {
    id: "archive",
    region: { col0: 0, row0: 0, col1: 5, row1: 4 },
    floor: 0xecd5b5,
    floorAlt: 0xe4caa6,
    label: { key: "zones.archive", icon: "📚" },
  },
  {
    id: "dev",
    region: { col0: 6, row0: 0, col1: 13, row1: 4 },
    floor: 0xdde9f6,
    floorAlt: 0xd2e1f1,
    label: { key: "zones.dev", icon: "💻" },
  },
  {
    id: "server",
    region: { col0: 14, row0: 0, col1: 19, row1: 4 },
    floor: 0xd3d9e2,
    floorAlt: 0xc8cfda,
    label: { key: "zones.server", icon: "🖥️" },
  },
  {
    id: "meeting",
    region: { col0: 0, row0: 5, col1: 5, row1: 9 },
    floor: 0xe2efd8,
    floorAlt: 0xd8e8cc,
    label: { key: "zones.meeting", icon: "🗂️" },
  },
  {
    id: "lobby",
    region: { col0: 6, row0: 5, col1: 13, row1: 9 },
    floor: 0xf6eee2,
    floorAlt: 0xf0e6d7,
    label: { key: "zones.lobby", icon: "🛋️" },
  },
  {
    id: "research",
    region: { col0: 14, row0: 5, col1: 19, row1: 9 },
    floor: 0xe8e1f4,
    floorAlt: 0xded5ee,
    label: { key: "zones.research", icon: "🔎" },
  },
  {
    id: "elevator",
    region: { col0: 0, row0: 10, col1: 3, row1: 13 },
    floor: 0xdadfe6,
    floorAlt: 0xd0d6de,
    label: { key: "zones.elevator", icon: "🛗" },
  },
  {
    id: "cafe",
    region: { col0: 4, row0: 10, col1: 8, row1: 13 },
    floor: 0xf7e4d6,
    floorAlt: 0xf1d9c8,
  },
  {
    id: "user_desk",
    region: { col0: 9, row0: 10, col1: 14, row1: 13 },
    floor: 0xd9f0ea,
    floorAlt: 0xcde9e1,
    label: { key: "zones.user_desk", icon: "🙋" },
  },
  {
    id: "lounge",
    region: { col0: 15, row0: 10, col1: 19, row1: 13 },
    floor: 0xf3e9da,
    floorAlt: 0xece0ce,
  },
];

export interface GridPoint {
  col: number;
  row: number;
}

/** Open floor spot where Claude stands while working in each zone. */
export const WALK_POINTS: Record<StalkerLayoutZone, GridPoint> = {
  lobby: { col: 10.6, row: 7.9 },
  archive: { col: 1.7, row: 4.3 },
  dev: { col: 13.5, row: 2.6 },
  server: { col: 15.4, row: 3.4 },
  meeting: { col: 4.4, row: 8.6 },
  research: { col: 18.2, row: 8.6 },
  elevator: { col: 1.4, row: 11.8 },
  user_desk: { col: 12.9, row: 12.4 },
};

/**
 * Buggy sprites are drawn at this scale so furniture reads small and cosy
 * against the rooms. Footprints below are in native sprite units and get
 * multiplied by it during placement.
 */
export const FURNITURE_SCALE = 0.65;
const K = FURNITURE_SCALE;

const DEV_DESK_COLS = [6.5, 8.4, 10.3, 12.2];
const DEV_DESK_ROWS = [0.6, 2.7];

/**
 * Subagents sit at the dev desks. The seat is a touch in front of the chair
 * so the character draws over it (sitting) instead of hiding behind it.
 */
const SEAT_ROW_OFFSET = 1.75 * K;

export const DEV_SEATS: GridPoint[] = DEV_DESK_ROWS.flatMap((row) =>
  DEV_DESK_COLS.map((col) => ({ col: col + K, row: row + SEAT_ROW_OFFSET })),
);

const USER_DESK = { col: 10.9, row: 10.7 };

/** Where the user's own avatar sits. */
export const USER_SEAT: GridPoint = {
  col: USER_DESK.col + K,
  row: USER_DESK.row + SEAT_ROW_OFFSET,
};

export interface FurnitureSpec {
  id: string;
  zone: StalkerLayoutZone | DecorRoom;
  path: string;
  /** Position in grid units; w/d in native sprite units (scaled by K). */
  fp: Footprint;
  /** Native pixels to raise the sprite (items resting on a surface). */
  lift?: number;
  /** Draw directly on top of another item (laptop on desk). */
  stackOn?: string;
  /** Flat floor decor drawn under everything else, at native size. */
  isRug?: boolean;
}

export interface PlacedFurniture extends FurnitureSpec {
  x: number;
  y: number;
  z: number;
  scale: number;
}

const DESK_LIFT = 34;

function fp(col: number, row: number, w: number, d: number): Footprint {
  return { col, row, w, d };
}

function deskWithLaptop(
  id: string,
  zone: StalkerLayoutZone,
  deskPath: string,
  col: number,
  row: number,
  chairPath = `${B}/furniture/chairGreen_c.png`,
): FurnitureSpec[] {
  return [
    { id, zone, path: deskPath, fp: fp(col, row, 2, 1) },
    {
      id: `${id}-laptop`,
      zone,
      path: `${B}/Props/laptop_a.png`,
      fp: fp(col + 0.7 * K, row + 0.15 * K, 0.65, 0.65),
      lift: DESK_LIFT,
      stackOn: id,
    },
    {
      id: `${id}-chair`,
      zone,
      path: chairPath,
      fp: fp(col + 0.6 * K, row + 1.1 * K, 0.8, 0.8),
    },
  ];
}

const DEV_DESKS: FurnitureSpec[] = DEV_DESK_ROWS.flatMap((row, ri) =>
  DEV_DESK_COLS.flatMap((col, ci) =>
    deskWithLaptop(
      `dev-desk-${ri}-${ci}`,
      "dev",
      `${B}/furniture/deskWhite_a.png`,
      col,
      row,
    ),
  ),
);

const SERVER_RACKS: FurnitureSpec[] = [14.3, 15.4, 16.5, 17.6, 18.7].map(
  (col, i) => ({
    id: `server-rack-${i}`,
    zone: "server",
    path: `${B}/Props/refrigeratorBlack_a.png`,
    fp: fp(col, 0.1, 1.5, 1.5),
  }),
);

const FURNITURE_SPECS: FurnitureSpec[] = [
  // 자료실 — shelves hug both back walls, reading table in the middle
  { id: "archive-shelf-1", zone: "archive", path: `${B}/furniture/bookshelfBooksBrown_a.png`, fp: fp(1.0, 0, 2, 1) },
  { id: "archive-shelf-2", zone: "archive", path: `${B}/furniture/bookshelfBooksRed_a.png`, fp: fp(2.4, 0, 2, 1) },
  { id: "archive-shelf-3", zone: "archive", path: `${B}/furniture/bookshelfBooksBrown_a.png`, fp: fp(3.8, 0, 2, 1) },
  { id: "archive-shelf-4", zone: "archive", path: `${B}/furniture/bookshelfBooksRed_b.png`, fp: fp(0, 1.0, 1, 2) },
  { id: "archive-shelf-5", zone: "archive", path: `${B}/furniture/bookshelfBooksBrown_b.png`, fp: fp(0, 2.4, 1, 2) },
  { id: "archive-table", zone: "archive", path: `${B}/furniture/tableSquareBrown.png`, fp: fp(2.4, 2.3, 2, 2) },
  { id: "archive-chair-l", zone: "archive", path: `${B}/furniture/chairBrown_b.png`, fp: fp(1.75, 2.6, 0.8, 0.8) },
  { id: "archive-chair-r", zone: "archive", path: `${B}/furniture/chairBrown_d.png`, fp: fp(3.8, 2.6, 0.8, 0.8) },
  { id: "archive-plant", zone: "archive", path: `${B}/Props/flowers.png`, fp: fp(5.2, 0.3, 0.8, 0.8) },
  { id: "archive-cactus", zone: "archive", path: `${B}/Props/cactus.png`, fp: fp(5.1, 4.1, 0.8, 0.8) },

  // 개발실
  ...DEV_DESKS,
  { id: "dev-plant", zone: "dev", path: `${B}/Props/cactus.png`, fp: fp(13.4, 4.1, 0.8, 0.8) },
  { id: "dev-flowers", zone: "dev", path: `${B}/Props/flowers.png`, fp: fp(6.1, 4.2, 0.8, 0.8) },

  // 서버실 — black fridges read as server racks
  ...SERVER_RACKS,
  ...deskWithLaptop("server-console", "server", `${B}/furniture/deskGray_a.png`, 16.6, 2.9),

  // 회의실
  { id: "meeting-table", zone: "meeting", path: `${B}/furniture/tableSquareGreen.png`, fp: fp(2.2, 6.6, 2, 2) },
  { id: "meeting-chair-n", zone: "meeting", path: `${B}/furniture/chairGreen_a.png`, fp: fp(2.6, 5.75, 0.8, 0.8) },
  { id: "meeting-chair-w", zone: "meeting", path: `${B}/furniture/chairGreen_b.png`, fp: fp(1.35, 7.0, 0.8, 0.8) },
  { id: "meeting-chair-e", zone: "meeting", path: `${B}/furniture/chairGreen_d.png`, fp: fp(3.65, 7.0, 0.8, 0.8) },
  { id: "meeting-chair-s", zone: "meeting", path: `${B}/furniture/chairGreen_c.png`, fp: fp(2.6, 8.05, 0.8, 0.8) },
  { id: "meeting-plant", zone: "meeting", path: `${B}/Props/cactus.png`, fp: fp(5.1, 9.1, 0.8, 0.8) },

  // 로비
  { id: "lobby-rug", zone: "lobby", path: `${B}/Props/rugLargeYellow.png`, fp: fp(8.4, 5.6, 4, 4), isRug: true },
  { id: "lobby-sofa", zone: "lobby", path: `${B}/furniture/sofaBigGreen_b.png`, fp: fp(7.4, 6.8, 1, 2) },
  { id: "lobby-table", zone: "lobby", path: `${B}/furniture/coffeeTableBrown.png`, fp: fp(8.6, 7.0, 1.3, 1.3) },
  { id: "lobby-flowers", zone: "lobby", path: `${B}/Props/flowers.png`, fp: fp(13.1, 5.2, 0.8, 0.8) },
  { id: "lobby-cactus", zone: "lobby", path: `${B}/Props/cactus.png`, fp: fp(6.2, 9.1, 0.8, 0.8) },
  { id: "lobby-cactus-2", zone: "lobby", path: `${B}/Props/cactus.png`, fp: fp(13.2, 9.1, 0.8, 0.8) },

  // 정보검색
  ...deskWithLaptop("research-desk-1", "research", `${B}/furniture/deskGray_a.png`, 14.6, 5.7),
  ...deskWithLaptop("research-desk-2", "research", `${B}/furniture/deskGray_a.png`, 16.4, 5.7),
  ...deskWithLaptop("research-desk-3", "research", `${B}/furniture/deskGray_a.png`, 18.2, 5.7),
  { id: "research-tv-stand", zone: "research", path: `${B}/furniture/tvStandTan_a.png`, fp: fp(15.2, 8.4, 2, 1) },
  {
    id: "research-tv",
    zone: "research",
    path: `${B}/Props/tv_a.png`,
    fp: fp(15.2 + 0.25 * K, 8.4 + 0.1 * K, 1.5, 0.8),
    lift: 30,
    stackOn: "research-tv-stand",
  },
  { id: "research-plant", zone: "research", path: `${B}/Props/cactus.png`, fp: fp(19.2, 9.1, 0.8, 0.8) },

  // 엘리베이터 홀
  { id: "elevator-plant", zone: "elevator", path: `${B}/Props/flowers.png`, fp: fp(3.2, 13.2, 0.8, 0.8) },

  // 카페
  { id: "cafe-counter", zone: "cafe", path: `${B}/Props/kitchenDrawerGreen_a.png`, fp: fp(4.5, 10.1, 2, 1) },
  {
    id: "cafe-coffee",
    zone: "cafe",
    path: `${B}/Props/coffeMaker_a.png`,
    fp: fp(4.5 + 0.7 * K, 10.1 + 0.2 * K, 0.6, 0.6),
    lift: 40,
    stackOn: "cafe-counter",
  },
  { id: "cafe-sink", zone: "cafe", path: `${B}/Props/kitchenSinkGreen_a.png`, fp: fp(5.95, 10.1, 2, 1) },
  { id: "cafe-table", zone: "cafe", path: `${B}/furniture/tableWhiteRound.png`, fp: fp(5.5, 11.9, 1.5, 1.5) },
  { id: "cafe-chair-l", zone: "cafe", path: `${B}/furniture/chairGreen_b.png`, fp: fp(4.75, 12.15, 0.8, 0.8) },
  { id: "cafe-chair-r", zone: "cafe", path: `${B}/furniture/chairGreen_d.png`, fp: fp(6.6, 12.15, 0.8, 0.8) },

  // 내 자리
  { id: "user-rug", zone: "user_desk", path: `${B}/Props/rugLargeBlue.png`, fp: fp(9.8, 10, 4, 4), isRug: true },
  ...deskWithLaptop("user-desk", "user_desk", `${B}/furniture/deskBrown_a.png`, USER_DESK.col, USER_DESK.row, `${B}/furniture/chairBrown_c.png`),
  { id: "user-plant", zone: "user_desk", path: `${B}/Props/cactus.png`, fp: fp(14.2, 13.1, 0.8, 0.8) },

  // 라운지
  { id: "lounge-sofa", zone: "lounge", path: `${B}/furniture/sofaBigGreen_a.png`, fp: fp(16.3, 10.3, 2, 1) },
  { id: "lounge-armchair", zone: "lounge", path: `${B}/furniture/sofaGreen_b.png`, fp: fp(15.4, 11.4, 1, 1) },
  { id: "lounge-table", zone: "lounge", path: `${B}/furniture/coffeeTableGreen.png`, fp: fp(16.6, 11.5, 1.3, 1.3) },
  { id: "lounge-flowers", zone: "lounge", path: `${B}/Props/flowers.png`, fp: fp(19.1, 10.2, 0.8, 0.8) },
  { id: "lounge-cactus", zone: "lounge", path: `${B}/Props/cactus.png`, fp: fp(19.1, 13.1, 0.8, 0.8) },
];

const RUG_Z = -500;

function placeFurniture(specs: FurnitureSpec[]): PlacedFurniture[] {
  const scaled = specs.map((spec) => {
    const scale = spec.isRug ? 1 : K;
    return {
      spec,
      scale,
      fp: { ...spec.fp, w: spec.fp.w * scale, d: spec.fp.d * scale },
    };
  });
  const baseZ = new Map(scaled.map((s) => [s.spec.id, footprintDepth(s.fp)]));
  return scaled.map(({ spec, scale, fp: footprint }) => {
    const base = footprintBase(footprint, ISO_ORIGIN);
    const parentZ = spec.stackOn ? baseZ.get(spec.stackOn) : undefined;
    const z = spec.isRug
      ? RUG_Z
      : parentZ !== undefined
        ? parentZ + 1
        : footprintDepth(footprint);
    const lift = (spec.lift ?? 0) * scale;
    return { ...spec, fp: footprint, x: base.x, y: base.y - lift, z, scale };
  });
}

export const OFFICE_FURNITURE: PlacedFurniture[] =
  placeFurniture(FURNITURE_SPECS);

export function resolveWalkZone(
  activityZone: string | null,
): StalkerLayoutZone {
  if (!activityZone || activityZone === "boss_desk") {
    return "lobby";
  }
  if (activityZone in WALK_POINTS) {
    return activityZone as StalkerLayoutZone;
  }
  return "lobby";
}

export function getZoneRegion(zone: StalkerLayoutZone): GridRegion | null {
  return OFFICE_ROOMS.find((room) => room.id === zone)?.region ?? null;
}

export function getAllStalkerAssetPaths(): string[] {
  return [...new Set(OFFICE_FURNITURE.map((item) => item.path))];
}
