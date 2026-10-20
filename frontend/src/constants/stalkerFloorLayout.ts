import type { CowboyZoneKey } from "@/systems/cowboyZones";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/constants/canvas";
import type { TranslationKey } from "@/i18n";
import { CHAIR_COLORS, PALETTE } from "@/constants/stalkerPalette";
import type { FurnitureKind } from "@/systems/stalkerFurnitureDraw";
import {
  TILE_H,
  TILE_W,
  footprintDepth,
  gridToScreen,
  type Footprint,
  type GridRegion,
  type IsoPoint,
} from "@/systems/stalkerIsoCoords";

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

const MAP_HEIGHT =
  WALL_HEIGHT + (GRID_COLS + GRID_ROWS) * (TILE_H / 2) + FLOOR_SLAB;

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
  /** wood = planks, checker = soft carpet squares, tile = small grid. */
  surface: "wood" | "checker" | "tile";
  label?: { key: ZoneLabelKey; icon: string };
}

export const OFFICE_ROOMS: OfficeRoom[] = [
  {
    id: "archive",
    region: { col0: 0, row0: 0, col1: 5, row1: 4 },
    floor: 0xf0d4ae,
    floorAlt: 0xe8c99f,
    surface: "wood",
    label: { key: "zones.archive", icon: "📚" },
  },
  {
    id: "dev",
    region: { col0: 6, row0: 0, col1: 13, row1: 4 },
    floor: 0xe2ecf8,
    floorAlt: 0xd8e4f4,
    surface: "checker",
    label: { key: "zones.dev", icon: "💻" },
  },
  {
    id: "server",
    region: { col0: 14, row0: 0, col1: 19, row1: 4 },
    floor: 0xdfe3ea,
    floorAlt: 0xd5dae3,
    surface: "tile",
    label: { key: "zones.server", icon: "🖥️" },
  },
  {
    id: "meeting",
    region: { col0: 0, row0: 5, col1: 5, row1: 9 },
    floor: 0xe6f2dc,
    floorAlt: 0xdcebcf,
    surface: "checker",
    label: { key: "zones.meeting", icon: "🗂️" },
  },
  {
    id: "lobby",
    region: { col0: 6, row0: 5, col1: 13, row1: 9 },
    floor: 0xf7e6cf,
    floorAlt: 0xefdbc0,
    surface: "wood",
    label: { key: "zones.lobby", icon: "🛋️" },
  },
  {
    id: "research",
    region: { col0: 14, row0: 5, col1: 19, row1: 9 },
    floor: 0xece4f7,
    floorAlt: 0xe2d8f2,
    surface: "checker",
    label: { key: "zones.research", icon: "🔎" },
  },
  {
    id: "elevator",
    region: { col0: 0, row0: 10, col1: 3, row1: 13 },
    floor: 0xe3e6ec,
    floorAlt: 0xd9dde5,
    surface: "tile",
    label: { key: "zones.elevator", icon: "🛗" },
  },
  {
    id: "cafe",
    region: { col0: 4, row0: 10, col1: 8, row1: 13 },
    floor: 0xfbe6d8,
    floorAlt: 0xf5d8c6,
    surface: "checker",
  },
  {
    id: "user_desk",
    region: { col0: 9, row0: 10, col1: 14, row1: 13 },
    floor: 0xf2dcc0,
    floorAlt: 0xe9cfaf,
    surface: "wood",
    label: { key: "zones.user_desk", icon: "🙋" },
  },
  {
    id: "lounge",
    region: { col0: 15, row0: 10, col1: 19, row1: 13 },
    floor: 0xf7e6cf,
    floorAlt: 0xefdbc0,
    surface: "wood",
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
 * Furniture footprints below are written in "piece units" and multiplied by
 * this scale on placement, so pieces read small and cosy against the rooms.
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
  piece: FurnitureKind;
  /** Position in grid units; w/d in piece units (scaled by K). */
  fp: Footprint;
  /** Sits on top of another item (laptop on desk) — painted right after it. */
  stackOn?: string;
}

export interface PlacedFurniture extends FurnitureSpec {
  z: number;
}

/** Desk / counter / stand surface heights (px) for stacked items. */
const DESK_TOP = 30;
const COUNTER_TOP = 30;
const STAND_TOP = 20;

/** Some desks get a mug — white, pink, butter (undefined = none). */
const MUG_COLORS: (number | undefined)[] = [
  0xffffff,
  undefined,
  PALETTE.pink,
  undefined,
  PALETTE.butter,
];

const BOOKS_WARM = [0xe07a5f, 0xf2cc8f, 0x81b29a, 0x3d405b, 0xe9c46a, 0xa8dadc];
const BOOKS_COOL = [0x8ecae6, 0x219ebc, 0xffb703, 0xfb8500, 0x90be6d, 0xcdb4db];

function fp(col: number, row: number, w: number, d: number): Footprint {
  return { col, row, w, d };
}

function deskWithLaptop(
  id: string,
  zone: StalkerLayoutZone,
  deskColor: number,
  col: number,
  row: number,
  chairColor: number = PALETTE.sage,
  mugColor?: number,
): FurnitureSpec[] {
  const mug: FurnitureSpec[] = mugColor
    ? [
        {
          id: `${id}-mug`,
          zone,
          piece: { kind: "mug", z: DESK_TOP, color: mugColor },
          fp: fp(col + 1.55 * K, row + 0.45 * K, 0.25, 0.25),
          stackOn: `${id}-laptop`,
        },
      ]
    : [];
  return [
    ...mug,
    {
      id,
      zone,
      piece: { kind: "desk", color: deskColor },
      fp: fp(col, row, 2, 1),
    },
    {
      id: `${id}-laptop`,
      zone,
      piece: { kind: "laptop", z: DESK_TOP },
      fp: fp(col + 0.7 * K, row + 0.2 * K, 0.6, 0.55),
      stackOn: id,
    },
    {
      id: `${id}-chair`,
      zone,
      piece: { kind: "chair", color: chairColor, facing: "-row" },
      fp: fp(col + 0.6 * K, row + 1.1 * K, 0.8, 0.8),
    },
  ];
}

const DEV_DESKS: FurnitureSpec[] = DEV_DESK_ROWS.flatMap((row, ri) =>
  DEV_DESK_COLS.flatMap((col, ci) =>
    deskWithLaptop(
      `dev-desk-${ri}-${ci}`,
      "dev",
      PALETTE.white,
      col,
      row,
      CHAIR_COLORS[(ri * DEV_DESK_COLS.length + ci) % CHAIR_COLORS.length],
      MUG_COLORS[(ri + ci) % MUG_COLORS.length],
    ),
  ),
);

const SERVER_RACKS: FurnitureSpec[] = [14.3, 15.4, 16.5, 17.6, 18.7].map(
  (col, i) => ({
    id: `server-rack-${i}`,
    zone: "server",
    piece: { kind: "serverRack" },
    fp: fp(col, 0.1, 1.5, 1.4),
  }),
);

const plant = (
  id: string,
  zone: StalkerLayoutZone | DecorRoom,
  variant: "leafy" | "cactus" | "flowers",
  col: number,
  row: number,
): FurnitureSpec => ({
  id,
  zone,
  piece: { kind: "plant", variant },
  fp: fp(col, row, 0.8, 0.8),
});

const FURNITURE_SPECS: FurnitureSpec[] = [
  // 자료실 — shelves hug both back walls, reading table in the middle
  {
    id: "archive-shelf-1",
    zone: "archive",
    piece: { kind: "bookshelf", facing: "+row", books: BOOKS_WARM },
    fp: fp(1.0, 0, 2, 0.9),
  },
  {
    id: "archive-shelf-2",
    zone: "archive",
    piece: { kind: "bookshelf", facing: "+row", books: BOOKS_COOL },
    fp: fp(2.4, 0, 2, 0.9),
  },
  {
    id: "archive-shelf-3",
    zone: "archive",
    piece: { kind: "bookshelf", facing: "+row", books: BOOKS_WARM },
    fp: fp(3.8, 0, 2, 0.9),
  },
  {
    id: "archive-shelf-4",
    zone: "archive",
    piece: { kind: "bookshelf", facing: "+col", books: BOOKS_COOL },
    fp: fp(0, 1.0, 0.9, 2),
  },
  {
    id: "archive-shelf-5",
    zone: "archive",
    piece: { kind: "bookshelf", facing: "+col", books: BOOKS_WARM },
    fp: fp(0, 2.4, 0.9, 2),
  },
  {
    id: "archive-table",
    zone: "archive",
    piece: { kind: "table", color: PALETTE.wood },
    fp: fp(2.4, 2.3, 2, 2),
  },
  {
    id: "archive-chair-l",
    zone: "archive",
    piece: { kind: "chair", color: PALETTE.brown, facing: "+col" },
    fp: fp(1.75, 2.6, 0.8, 0.8),
  },
  {
    id: "archive-chair-r",
    zone: "archive",
    piece: { kind: "chair", color: PALETTE.brown, facing: "-col" },
    fp: fp(3.8, 2.6, 0.8, 0.8),
  },
  plant("archive-plant", "archive", "flowers", 5.2, 0.3),
  plant("archive-cactus", "archive", "cactus", 5.1, 4.1),

  // 개발실
  ...DEV_DESKS,
  plant("dev-plant", "dev", "leafy", 13.4, 4.1),
  plant("dev-flowers", "dev", "flowers", 6.1, 4.2),

  // 서버실
  ...SERVER_RACKS,
  ...deskWithLaptop("server-console", "server", PALETTE.gray, 16.6, 2.9),

  // 회의실
  {
    id: "meeting-table",
    zone: "meeting",
    piece: { kind: "table", color: PALETTE.white },
    fp: fp(2.2, 6.6, 2, 2),
  },
  {
    id: "meeting-chair-n",
    zone: "meeting",
    piece: { kind: "chair", color: PALETTE.sage, facing: "+row" },
    fp: fp(2.6, 5.75, 0.8, 0.8),
  },
  {
    id: "meeting-chair-w",
    zone: "meeting",
    piece: { kind: "chair", color: PALETTE.sage, facing: "+col" },
    fp: fp(1.35, 7.0, 0.8, 0.8),
  },
  {
    id: "meeting-chair-e",
    zone: "meeting",
    piece: { kind: "chair", color: PALETTE.sage, facing: "-col" },
    fp: fp(3.65, 7.0, 0.8, 0.8),
  },
  {
    id: "meeting-chair-s",
    zone: "meeting",
    piece: { kind: "chair", color: PALETTE.sage, facing: "-row" },
    fp: fp(2.6, 8.05, 0.8, 0.8),
  },
  plant("meeting-plant", "meeting", "leafy", 5.1, 9.1),

  // 로비
  {
    id: "lobby-rug",
    zone: "lobby",
    piece: { kind: "rug", color: 0xf6d38a, pattern: "dots" },
    fp: fp(8.4, 5.6, 4 / K, 4 / K),
  },
  {
    id: "lobby-sofa",
    zone: "lobby",
    piece: { kind: "sofa", color: PALETTE.peach, facing: "+col" },
    fp: fp(7.4, 6.8, 1, 2),
  },
  {
    id: "lobby-table",
    zone: "lobby",
    piece: { kind: "coffeeTable", color: PALETTE.wood },
    fp: fp(8.6, 7.0, 1.3, 1.3),
  },
  plant("lobby-flowers", "lobby", "flowers", 13.1, 5.2),
  plant("lobby-cactus", "lobby", "cactus", 6.2, 9.1),
  plant("lobby-leafy", "lobby", "leafy", 13.2, 9.1),

  // 정보검색실
  ...deskWithLaptop("research-desk-1", "research", PALETTE.gray, 14.6, 5.7),
  ...deskWithLaptop("research-desk-2", "research", PALETTE.gray, 16.4, 5.7),
  ...deskWithLaptop("research-desk-3", "research", PALETTE.gray, 18.2, 5.7),
  {
    id: "research-tv-stand",
    zone: "research",
    piece: { kind: "tvStand", color: PALETTE.wood },
    fp: fp(15.2, 8.4, 2, 0.9),
  },
  {
    id: "research-tv",
    zone: "research",
    piece: { kind: "tv", z: STAND_TOP },
    fp: fp(15.2 + 0.2 * K, 8.4 + 0.15 * K, 1.6, 0.5),
    stackOn: "research-tv-stand",
  },
  plant("research-plant", "research", "cactus", 19.2, 9.1),

  // 엘리베이터 홀
  plant("elevator-plant", "elevator", "flowers", 3.2, 13.2),

  // 카페
  {
    id: "cafe-counter",
    zone: "cafe",
    piece: { kind: "counter", color: 0xa8c3a0 },
    fp: fp(4.5, 10.1, 2, 1),
  },
  {
    id: "cafe-coffee",
    zone: "cafe",
    piece: { kind: "coffeeMaker", z: COUNTER_TOP },
    fp: fp(4.5 + 0.35 * K, 10.1 + 0.2 * K, 0.5, 0.5),
    stackOn: "cafe-counter",
  },
  {
    id: "cafe-sink",
    zone: "cafe",
    piece: { kind: "counter", color: 0xa8c3a0, sink: true },
    fp: fp(5.95, 10.1, 2, 1),
  },
  {
    id: "cafe-table",
    zone: "cafe",
    piece: { kind: "roundTable", color: PALETTE.white },
    fp: fp(5.5, 11.9, 1.4, 1.4),
  },
  {
    id: "cafe-chair-l",
    zone: "cafe",
    piece: { kind: "chair", color: PALETTE.sage, facing: "+col" },
    fp: fp(4.75, 12.15, 0.8, 0.8),
  },
  {
    id: "cafe-chair-r",
    zone: "cafe",
    piece: { kind: "chair", color: PALETTE.sage, facing: "-col" },
    fp: fp(6.6, 12.15, 0.8, 0.8),
  },

  // 내 자리
  {
    id: "user-rug",
    zone: "user_desk",
    piece: { kind: "rug", color: 0x9cc3ea, pattern: "stripes" },
    fp: fp(9.8, 10, 4 / K, 4 / K),
  },
  ...deskWithLaptop(
    "user-desk",
    "user_desk",
    PALETTE.wood,
    USER_DESK.col,
    USER_DESK.row,
    PALETTE.brown,
  ),
  plant("user-plant", "user_desk", "leafy", 14.2, 13.1),

  // 라운지
  {
    id: "lounge-sofa",
    zone: "lounge",
    piece: { kind: "sofa", color: PALETTE.sage, facing: "+row" },
    fp: fp(16.3, 10.3, 2, 1),
  },
  {
    id: "lounge-armchair",
    zone: "lounge",
    piece: { kind: "sofa", color: PALETTE.lilac, facing: "+col" },
    fp: fp(15.4, 11.4, 1, 1),
  },
  {
    id: "lounge-table",
    zone: "lounge",
    piece: { kind: "coffeeTable", color: PALETTE.wood },
    fp: fp(16.6, 11.5, 1.3, 1.3),
  },
  plant("lounge-flowers", "lounge", "flowers", 19.1, 10.2),
  plant("lounge-cactus", "lounge", "cactus", 19.1, 13.1),
];

const RUG_Z = -500;

function placeFurniture(specs: FurnitureSpec[]): PlacedFurniture[] {
  const scaled = specs.map((spec) => ({
    ...spec,
    fp: { ...spec.fp, w: spec.fp.w * K, d: spec.fp.d * K },
  }));
  const baseZ = new Map(scaled.map((s) => [s.id, footprintDepth(s.fp)]));
  return scaled.map((spec) => {
    const parentZ = spec.stackOn ? baseZ.get(spec.stackOn) : undefined;
    const z =
      spec.piece.kind === "rug"
        ? RUG_Z
        : parentZ !== undefined
          ? parentZ + 1
          : footprintDepth(spec.fp);
    return { ...spec, z };
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
