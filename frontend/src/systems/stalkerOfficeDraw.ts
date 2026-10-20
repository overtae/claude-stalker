/**
 * Procedural floor + back-wall rendering for the Stalker office.
 *
 * Floors and walls are drawn as exact polygons on the iso grid instead of
 * tiled sprites, so nothing overlaps or bleeds past the room edges.
 */
import type { Graphics } from "pixi.js";
import {
  FLOOR_SLAB,
  GRID_COLS,
  GRID_ROWS,
  OFFICE_ROOMS,
  WALL_HEIGHT,
  WALL_THICKNESS,
  toScreen,
} from "@/constants/stalkerFloorLayout";
import type { GridRegion, IsoPoint } from "@/systems/stalkerIsoCoords";
import { shade } from "@/constants/stalkerPalette";
import {
  drawStringLights,
  drawSunbeams,
  drawWallArt,
} from "@/systems/stalkerCozyDecor";

/** Soft warm hairline — matches the furniture edges, no hard black borders. */
const OUTLINE = 0xb5a38c;
const SLAB_LEFT = 0xcdb79c;
const SLAB_RIGHT = 0xb9a184;
const WALL_LEFT = 0xfdf6ec;
const WALL_RIGHT = 0xf6ebdc;
const WALL_CAP = 0xfffbf5;
const BASEBOARD = 0xd9c2a4;
const BASEBOARD_H = 7;
/** Lower wall panelling (wainscot) with a white trim rail on top. */
const WAINSCOT_H = 44;
const WAINSCOT_LEFT = 0xd5e6cc;
const WAINSCOT_RIGHT = 0xc8dcbe;

function up(p: IsoPoint, h: number): IsoPoint {
  return { x: p.x, y: p.y - h };
}

export function poly(g: Graphics, pts: IsoPoint[]): Graphics {
  return g.poly(pts.flatMap((p) => [p.x, p.y]));
}

function regionCorners(region: GridRegion): IsoPoint[] {
  const { col0, row0, col1, row1 } = region;
  return [
    toScreen(col0, row0),
    toScreen(col1 + 1, row0),
    toScreen(col1 + 1, row1 + 1),
    toScreen(col0, row1 + 1),
  ];
}

function drawSlab(g: Graphics): void {
  const t = WALL_THICKNESS;
  const back = toScreen(-t, -t);
  const right = toScreen(GRID_COLS, -t);
  const front = toScreen(GRID_COLS, GRID_ROWS);
  const left = toScreen(-t, GRID_ROWS);

  // soft drop shadow under the whole floor
  const drop = (p: IsoPoint): IsoPoint => ({
    x: p.x + 6,
    y: p.y + FLOOR_SLAB + 14,
  });
  poly(g, [drop(left), drop(front), drop(right), drop(back)]);
  g.fill({ color: 0x475569, alpha: 0.1 });

  poly(g, [left, front, up(front, -FLOOR_SLAB), up(left, -FLOOR_SLAB)]);
  g.fill({ color: SLAB_LEFT });
  g.stroke({ color: OUTLINE, width: 1.5, join: "round" });
  poly(g, [front, right, up(right, -FLOOR_SLAB), up(front, -FLOOR_SLAB)]);
  g.fill({ color: SLAB_RIGHT });
  g.stroke({ color: OUTLINE, width: 1.5, join: "round" });

  // strip under the walls (wall thickness)
  poly(g, [
    back,
    right,
    toScreen(GRID_COLS, 0),
    toScreen(0, 0),
    toScreen(0, GRID_ROWS),
    left,
  ]);
  g.fill({ color: 0xe9dcc8 });
}

function cell(col: number, row: number, w = 1, d = 1): IsoPoint[] {
  return [
    toScreen(col, row),
    toScreen(col + w, row),
    toScreen(col + w, row + d),
    toScreen(col, row + d),
  ];
}

function line(g: Graphics, a: IsoPoint, b: IsoPoint): void {
  g.moveTo(a.x, a.y).lineTo(b.x, b.y);
}

/** Planks run along the col axis with staggered end seams. */
function drawWoodFloor(g: Graphics, region: GridRegion, color: number): void {
  const { col0, row0, col1, row1 } = region;
  const step = 0.5;
  for (let r = row0, i = 0; r < row1 + 1; r += step, i++) {
    if (i % 2 === 1) {
      poly(g, cell(col0, r, col1 + 1 - col0, step));
      g.fill({ color, alpha: 0.35 });
    }
    line(g, toScreen(col0, r), toScreen(col1 + 1, r));
    for (let c = col0 + (i % 3) * 0.7 + 0.5; c < col1 + 1; c += 2.1) {
      line(g, toScreen(c, r), toScreen(c, r + step));
    }
  }
  g.stroke({ color: 0xb08d68, width: 1, alpha: 0.22 });
}

function drawCheckerFloor(g: Graphics, region: GridRegion, alt: number): void {
  const { col0, row0, col1, row1 } = region;
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      if ((col + row) % 2 === 1) {
        poly(g, cell(col, row));
        g.fill({ color: alt });
      }
    }
  }
}

function drawTileFloor(g: Graphics, region: GridRegion, alt: number): void {
  const { col0, row0, col1, row1 } = region;
  for (let r = row0; r <= row1 + 1; r += 0.5) {
    line(g, toScreen(col0, r), toScreen(col1 + 1, r));
  }
  for (let c = col0; c <= col1 + 1; c += 0.5) {
    line(g, toScreen(c, row0), toScreen(c, row1 + 1));
  }
  g.stroke({ color: alt, width: 1.2 });
}

function drawRoomFloors(g: Graphics): void {
  for (const room of OFFICE_ROOMS) {
    poly(g, regionCorners(room.region));
    g.fill({ color: room.floor });
    if (room.surface === "wood") {
      drawWoodFloor(g, room.region, room.floorAlt);
    } else if (room.surface === "tile") {
      drawTileFloor(g, room.region, room.floorAlt);
    } else {
      drawCheckerFloor(g, room.region, room.floorAlt);
    }
  }

  // room dividers: soft light seam with a faint shadow line
  for (const room of OFFICE_ROOMS) {
    poly(g, regionCorners(room.region));
    g.stroke({ color: 0xffffff, width: 3, alpha: 0.7, join: "round" });
    poly(g, regionCorners(room.region));
    g.stroke({ color: 0x8b7355, width: 1, alpha: 0.18, join: "round" });
  }

  poly(g, [
    toScreen(0, 0),
    toScreen(GRID_COLS, 0),
    toScreen(GRID_COLS, GRID_ROWS),
    toScreen(0, GRID_ROWS),
  ]);
  g.stroke({ color: OUTLINE, width: 1.5, join: "round" });
}

/** Parallelogram on the row=0 wall between cols a..b, heights h0..h1. */
export function rightWallQuad(
  a: number,
  b: number,
  h0: number,
  h1: number,
): IsoPoint[] {
  const pa = toScreen(a, 0);
  const pb = toScreen(b, 0);
  return [up(pa, h1), up(pb, h1), up(pb, h0), up(pa, h0)];
}

/** Parallelogram on the col=0 wall between rows a..b, heights h0..h1. */
export function leftWallQuad(
  a: number,
  b: number,
  h0: number,
  h1: number,
): IsoPoint[] {
  const pa = toScreen(0, a);
  const pb = toScreen(0, b);
  return [up(pa, h1), up(pb, h1), up(pb, h0), up(pa, h0)];
}

function drawWallFaces(g: Graphics): void {
  const t = WALL_THICKNESS;
  const h = WALL_HEIGHT;
  const corner = toScreen(0, 0);
  const rightEnd = toScreen(GRID_COLS, 0);
  const leftEnd = toScreen(0, GRID_ROWS);

  // left wall (col = 0)
  poly(g, [corner, leftEnd, up(leftEnd, h), up(corner, h)]);
  g.fill({ color: WALL_LEFT });
  poly(g, leftWallQuad(0, GRID_ROWS, 0, WAINSCOT_H));
  g.fill({ color: WAINSCOT_LEFT });
  poly(g, leftWallQuad(0, GRID_ROWS, WAINSCOT_H, WAINSCOT_H + 4));
  g.fill({ color: 0xffffff });
  poly(g, leftWallQuad(0, GRID_ROWS, 0, BASEBOARD_H));
  g.fill({ color: BASEBOARD });
  poly(g, [corner, leftEnd, up(leftEnd, h), up(corner, h)]);
  g.stroke({ color: OUTLINE, width: 1.5, join: "round" });

  // right wall (row = 0)
  poly(g, [corner, rightEnd, up(rightEnd, h), up(corner, h)]);
  g.fill({ color: WALL_RIGHT });
  poly(g, rightWallQuad(0, GRID_COLS, 0, WAINSCOT_H));
  g.fill({ color: WAINSCOT_RIGHT });
  poly(g, rightWallQuad(0, GRID_COLS, WAINSCOT_H, WAINSCOT_H + 4));
  g.fill({ color: 0xffffff });
  poly(g, rightWallQuad(0, GRID_COLS, 0, BASEBOARD_H));
  g.fill({ color: BASEBOARD });
  poly(g, [corner, rightEnd, up(rightEnd, h), up(corner, h)]);
  g.stroke({ color: OUTLINE, width: 1.5, join: "round" });

  // end caps (wall thickness visible at the open ends)
  poly(g, [
    leftEnd,
    toScreen(-t, GRID_ROWS),
    up(toScreen(-t, GRID_ROWS), h),
    up(leftEnd, h),
  ]);
  g.fill({ color: 0xe6d6bf });
  g.stroke({ color: OUTLINE, width: 1.5, join: "round" });
  poly(g, [
    rightEnd,
    toScreen(GRID_COLS, -t),
    up(toScreen(GRID_COLS, -t), h),
    up(rightEnd, h),
  ]);
  g.fill({ color: 0xdccab0 });
  g.stroke({ color: OUTLINE, width: 1.5, join: "round" });

  // top cap
  poly(g, [
    up(toScreen(-t, -t), h),
    up(toScreen(GRID_COLS, -t), h),
    up(rightEnd, h),
    up(corner, h),
    up(leftEnd, h),
    up(toScreen(-t, GRID_ROWS), h),
  ]);
  g.fill({ color: WALL_CAP });
  g.stroke({ color: OUTLINE, width: 1.5, join: "round" });
}

export type SkyPhase = "day" | "dusk" | "night";

const CURTAIN = 0xf7b89c;

const SKY: Record<SkyPhase, { color: number; glint: number }> = {
  day: { color: 0xcfe9f8, glint: 0.55 },
  dusk: { color: 0xfcd9bd, glint: 0.4 },
  night: { color: 0x34466b, glint: 0.12 },
};

/** Real local time drives the view outside (the legacy city window idea). */
export function skyPhase(date: Date): SkyPhase {
  const h = date.getHours();
  if (h >= 7 && h < 17) {
    return "day";
  }
  if ((h >= 17 && h < 19) || (h >= 5 && h < 7)) {
    return "dusk";
  }
  return "night";
}

function drawWindow(g: Graphics, a: number, b: number, phase: SkyPhase): void {
  const h0 = 52;
  const h1 = 124;
  const sky = SKY[phase];
  poly(g, rightWallQuad(a - 0.12, b + 0.12, h0 - 7, h1 + 7));
  g.fill({ color: 0xffffff });
  g.stroke({ color: OUTLINE, width: 1.5, join: "round" });
  poly(g, rightWallQuad(a, b, h0, h1));
  g.fill({ color: sky.color });
  if (phase === "night") {
    for (const [c, h] of [
      [a + 0.5, 108],
      [a + 1.4, 96],
      [b - 0.5, 112],
      [b - 0.9, 80],
    ] as const) {
      const star = up(toScreen(c, 0), h);
      g.circle(star.x, star.y, 1.4);
    }
    g.fill({ color: 0xfef9c3 });
  }
  if (phase === "day") {
    for (const [c, h, r] of [
      [a + 0.6, 104, 6],
      [a + 0.85, 106, 7.5],
      [a + 1.1, 103, 5.5],
      [b - 0.55, 82, 5],
      [b - 0.35, 84, 6.5],
    ] as const) {
      const puff = up(toScreen(c, 0), h);
      g.circle(puff.x, puff.y, r);
    }
    g.fill({ color: 0xffffff, alpha: 0.9 });
  }
  // glint
  poly(g, rightWallQuad(a + 0.25, a + 0.6, h0 + 10, h1 - 6));
  g.fill({ color: 0xffffff, alpha: sky.glint });
  // mullions
  const mid = (a + b) / 2;
  poly(g, rightWallQuad(mid - 0.04, mid + 0.04, h0, h1));
  g.fill({ color: 0xffffff });
  poly(g, rightWallQuad(a, b, (h0 + h1) / 2 - 2, (h0 + h1) / 2 + 2));
  g.fill({ color: 0xffffff });
  // tied-back curtains + rod
  for (const [c0, c1] of [
    [a - 0.2, a + 0.22],
    [b - 0.22, b + 0.2],
  ] as const) {
    poly(g, rightWallQuad(c0, c1, h0 - 2, h1 + 6));
    g.fill({ color: CURTAIN });
    poly(g, rightWallQuad(c0 + 0.12, c0 + 0.18, h0 - 2, h1 + 6));
    g.fill({ color: shade(CURTAIN, 0.9) });
    poly(g, rightWallQuad(c0, c1, h0 + 30, h0 + 34));
    g.fill({ color: 0xfbf3e6 });
  }
  poly(g, rightWallQuad(a - 0.3, b + 0.3, h1 + 8, h1 + 11));
  g.fill({ color: 0xbd8c60 });
}

/** Meeting-room whiteboard on the col=0 wall — also the click target. */
export const WHITEBOARD_QUAD = leftWallQuad(5.5, 8.9, 48, 122);

function drawWhiteboard(g: Graphics): void {
  poly(g, WHITEBOARD_QUAD);
  g.fill({ color: 0xfdfdfd });
  g.stroke({ color: 0x94a3b8, width: 3, join: "round" });
  poly(g, WHITEBOARD_QUAD);
  g.stroke({ color: OUTLINE, width: 1.5, join: "round" });

  const stickies: [number, number, number][] = [
    [5.9, 92, 0xfde68a],
    [6.6, 96, 0xfbcfe8],
    [7.3, 90, 0xbfdbfe],
    [5.95, 64, 0xbbf7d0],
    [6.65, 60, 0xfde68a],
  ];
  for (const [row, h, color] of stickies) {
    poly(g, leftWallQuad(row, row + 0.5, h, h + 18));
    g.fill({ color });
  }
  // scribbles
  const s0 = up(toScreen(0, 7.6), 98);
  const s1 = up(toScreen(0, 8.5), 108);
  g.moveTo(s0.x, s0.y).lineTo(s1.x, s1.y);
  const s2 = up(toScreen(0, 7.6), 80);
  const s3 = up(toScreen(0, 8.4), 76);
  g.moveTo(s2.x, s2.y).lineTo(s3.x, s3.y);
  g.stroke({ color: 0xd97757, width: 2, cap: "round" });
  // tray
  poly(g, leftWallQuad(5.6, 8.8, 44, 49));
  g.fill({ color: 0xcbd5e1 });
}

function drawElevator(g: Graphics): void {
  poly(g, leftWallQuad(10.3, 13.1, 0, 128));
  g.fill({ color: 0xaab4c0 });
  g.stroke({ color: OUTLINE, width: 1.5, join: "round" });
  poly(g, leftWallQuad(10.55, 11.68, 0, 112));
  g.fill({ color: 0xdfe5ec });
  poly(g, leftWallQuad(11.72, 12.85, 0, 112));
  g.fill({ color: 0xd3dae3 });
  poly(g, leftWallQuad(10.55, 12.85, 0, 112));
  g.stroke({ color: OUTLINE, width: 1.5, join: "round" });
  // floor indicator + call button
  const ind = up(toScreen(0, 11.7), 120);
  g.roundRect(ind.x - 9, ind.y - 5, 18, 9, 3);
  g.fill({ color: 0x1e293b });
  g.circle(ind.x, ind.y - 0.5, 2.4);
  g.fill({ color: 0xfbbf24 });
  const btn = up(toScreen(0, 13.45), 58);
  g.roundRect(btn.x - 4, btn.y - 8, 8, 16, 3);
  g.fill({ color: 0xe2e8f0 });
  g.stroke({ color: OUTLINE, width: 1.2 });
  g.circle(btn.x, btn.y - 2, 1.8);
  g.fill({ color: 0x22c55e });
}

function drawClock(g: Graphics, date: Date): void {
  const c = up(toScreen(13.55, 0), 104);
  g.ellipse(c.x, c.y, 11, 13);
  g.fill({ color: 0xffffff });
  g.stroke({ color: OUTLINE, width: 1.5 });
  const minuteAngle = (date.getMinutes() / 60) * Math.PI * 2;
  const hourAngle =
    ((date.getHours() % 12) / 12) * Math.PI * 2 + minuteAngle / 12;
  // the face sits on a wall slanting down-right; squash x a little to match
  const hand = (angle: number, len: number) => ({
    x: c.x + Math.sin(angle) * len * 0.85,
    y: c.y - Math.cos(angle) * len,
  });
  const m = hand(minuteAngle, 9);
  const h = hand(hourAngle, 5.5);
  g.moveTo(c.x, c.y).lineTo(m.x, m.y);
  g.moveTo(c.x, c.y).lineTo(h.x, h.y);
  g.stroke({ color: OUTLINE, width: 1.5, cap: "round" });
}

export function drawOfficeShell(g: Graphics, date: Date): void {
  const phase = skyPhase(date);
  g.clear();
  drawSlab(g);
  drawRoomFloors(g);
  drawSunbeams(g, phase);
  drawWallFaces(g);
  drawStringLights(g);
  drawWallArt(g);
  drawWindow(g, 6.9, 9.3, phase);
  drawWindow(g, 10.5, 12.9, phase);
  drawClock(g, date);
  drawWhiteboard(g);
  drawElevator(g);
}

export function drawZoneHighlight(
  g: Graphics,
  region: GridRegion | null,
): void {
  g.clear();
  if (!region) {
    return;
  }
  const pts = regionCorners(region);
  poly(g, pts);
  g.fill({ color: 0xe38c69, alpha: 0.16 });
  poly(g, pts);
  g.stroke({ color: 0xd97757, width: 3, alpha: 0.8, join: "round" });
}

/** Middle of the room's front-left edge, nudged inside — label anchor. */
export function roomLabelPoint(region: GridRegion): IsoPoint {
  return toScreen((region.col0 + region.col1 + 1) / 2, region.row1 + 0.35);
}
