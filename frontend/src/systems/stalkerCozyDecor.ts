/**
 * Cozy touches baked into the static office shell: sunbeams on the floor,
 * fairy lights along the wall tops and a few framed prints.
 */
import type { Graphics } from "pixi.js";
import { GRID_ROWS, toScreen } from "@/constants/stalkerFloorLayout";
import { shade } from "@/constants/stalkerPalette";
import type { IsoPoint } from "@/systems/stalkerIsoCoords";

type Phase = "day" | "dusk" | "night";

function up(p: IsoPoint, h: number): IsoPoint {
  return { x: p.x, y: p.y - h };
}

function poly(g: Graphics, pts: IsoPoint[]): Graphics {
  return g.poly(pts.flatMap((p) => [p.x, p.y]));
}

/** Point on the row=0 wall (`wall` = "right") or the col=0 wall ("left"). */
function onWall(wall: "left" | "right", t: number, h: number): IsoPoint {
  return up(wall === "right" ? toScreen(t, 0) : toScreen(0, t), h);
}

function wallQuad(
  wall: "left" | "right",
  a: number,
  b: number,
  h0: number,
  h1: number,
): IsoPoint[] {
  return [
    onWall(wall, a, h1),
    onWall(wall, b, h1),
    onWall(wall, b, h0),
    onWall(wall, a, h0),
  ];
}

// ---------------------------------------------------------------------------
// Sunbeams
// ---------------------------------------------------------------------------

/** Window spans on the right wall (cols) — keep in sync with drawWindow calls. */
const WINDOWS: [number, number][] = [
  [6.9, 9.3],
  [10.5, 12.9],
];

const BEAM: Record<Phase, { color: number; alpha: number } | null> = {
  day: { color: 0xfff1c2, alpha: 0.32 },
  dusk: { color: 0xffcfa3, alpha: 0.26 },
  night: null,
};

export function drawSunbeams(g: Graphics, phase: Phase): void {
  const beam = BEAM[phase];
  if (!beam) {
    return;
  }
  for (const [a, b] of WINDOWS) {
    poly(g, [
      toScreen(a + 0.3, 0.15),
      toScreen(b + 0.3, 0.15),
      toScreen(b + 1.5, 3.3),
      toScreen(a + 1.5, 3.3),
    ]);
    g.fill({ color: beam.color, alpha: beam.alpha });
  }
}

// ---------------------------------------------------------------------------
// Fairy lights
// ---------------------------------------------------------------------------

const BULB_COLORS = [0xffd27a, 0xff9f8a, 0xa8dcff, 0xb9eea8, 0xf5b8c8];
const LIGHT_H = 140;
const SAG = 9;
const SWAG = 2.4;
const BULBS_PER_SWAG = 4;
/** Right-wall lights stop before the LED ticker above the server racks. */
const RIGHT_LIGHTS_END = 14.0;

function drawGarland(
  g: Graphics,
  wall: "left" | "right",
  from: number,
  to: number,
): void {
  const swags = Math.max(1, Math.round((to - from) / SWAG));
  const len = (to - from) / swags;
  const at = (t: number) => {
    const local = ((t - from) % len) / len;
    return onWall(wall, t, LIGHT_H - SAG * 4 * local * (1 - local));
  };

  const steps = swags * 16;
  for (let i = 0; i <= steps; i++) {
    const p = at(from + ((to - from) * i) / steps);
    if (i === 0) {
      g.moveTo(p.x, p.y);
    } else {
      g.lineTo(p.x, p.y);
    }
  }
  g.stroke({ color: 0x8a7a66, width: 1, alpha: 0.6 });

  let n = 0;
  for (let s = 0; s < swags; s++) {
    for (let k = 1; k <= BULBS_PER_SWAG; k++) {
      const p = at(from + s * len + (len * k) / (BULBS_PER_SWAG + 1));
      const color = BULB_COLORS[n % BULB_COLORS.length];
      g.circle(p.x, p.y + 3, 6);
      g.fill({ color, alpha: 0.22 });
      g.circle(p.x, p.y + 3, 2.4);
      g.fill({ color });
      n++;
    }
  }
}

export function drawStringLights(g: Graphics): void {
  drawGarland(g, "left", 0.3, GRID_ROWS - 0.3);
  drawGarland(g, "right", 0.3, RIGHT_LIGHTS_END);
}

// ---------------------------------------------------------------------------
// Framed prints
// ---------------------------------------------------------------------------

function frame(
  g: Graphics,
  wall: "left" | "right",
  a: number,
  b: number,
  h0: number,
  h1: number,
  mat: number,
): void {
  poly(g, wallQuad(wall, a, b, h0, h1));
  g.fill({ color: 0xc99a70 });
  poly(g, wallQuad(wall, a + 0.05, b - 0.05, h0 + 3, h1 - 3));
  g.fill({ color: mat });
}

/** Tiny landscape: sky, sun, two hills. */
function landscape(
  g: Graphics,
  wall: "left" | "right",
  a: number,
  b: number,
  h0: number,
  h1: number,
): void {
  frame(g, wall, a, b, h0, h1, 0xd7ecfb);
  const mid = (a + b) / 2;
  poly(g, [
    onWall(wall, a + 0.05, h0 + 3),
    onWall(wall, mid, h0 + 18),
    onWall(wall, b - 0.05, h0 + 6),
    onWall(wall, b - 0.05, h0 + 3),
  ]);
  g.fill({ color: 0x9fd39a });
  poly(g, [
    onWall(wall, a + 0.05, h0 + 10),
    onWall(wall, a + 0.3, h0 + 14),
    onWall(wall, mid, h0 + 3),
    onWall(wall, a + 0.05, h0 + 3),
  ]);
  g.fill({ color: shade(0x9fd39a, 0.85) });
  const sun = onWall(wall, b - 0.22, h1 - 10);
  g.circle(sun.x, sun.y, 3.5);
  g.fill({ color: 0xffd27a });
}

/** Pink print with a little heart. */
function heartPrint(
  g: Graphics,
  wall: "left" | "right",
  a: number,
  b: number,
  h0: number,
  h1: number,
): void {
  frame(g, wall, a, b, h0, h1, 0xfbe1e8);
  const c = onWall(wall, (a + b) / 2, (h0 + h1) / 2);
  g.circle(c.x - 2.6, c.y - 1.5, 3);
  g.circle(c.x + 2.6, c.y - 1.5, 3);
  g.poly([c.x - 5.4, c.y - 0.5, c.x + 5.4, c.y - 0.5, c.x, c.y + 6]);
  g.fill({ color: 0xf28ba8 });
}

/** Mint print with a Claude-orange sparkle. */
function sparklePrint(
  g: Graphics,
  wall: "left" | "right",
  a: number,
  b: number,
  h0: number,
  h1: number,
): void {
  frame(g, wall, a, b, h0, h1, 0xe3f4ec);
  const c = onWall(wall, (a + b) / 2, (h0 + h1) / 2);
  const r = 6;
  const k = r * 0.32;
  g.poly([
    c.x,
    c.y - r,
    c.x + k,
    c.y - k,
    c.x + r,
    c.y,
    c.x + k,
    c.y + k,
    c.x,
    c.y + r,
    c.x - k,
    c.y + k,
    c.x - r,
    c.y,
    c.x - k,
    c.y - k,
  ]);
  g.fill({ color: 0xd97757 });
}

export function drawWallArt(g: Graphics): void {
  // above the archive bookshelves on the left wall
  landscape(g, "left", 1.2, 2.2, 84, 118);
  heartPrint(g, "left", 2.6, 3.3, 88, 114);
  // above the archive shelves on the right wall
  sparklePrint(g, "right", 2.0, 2.7, 88, 114);
  landscape(g, "right", 3.2, 4.4, 84, 118);
}
