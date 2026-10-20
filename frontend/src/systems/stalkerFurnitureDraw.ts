/**
 * Procedural isometric furniture for the Stalker office.
 *
 * Everything is built from one primitive — an axis-aligned box on the iso
 * grid with three shaded faces and a hairline outline in a darker tone of
 * its own colour (no black borders). Composite pieces (desk, chair, shelf…)
 * are lists of boxes painted back-to-front.
 */
import type { Graphics } from "pixi.js";
import { toScreen } from "@/constants/stalkerFloorLayout";
import type { Footprint, IsoPoint } from "@/systems/stalkerIsoCoords";
import { PALETTE, shade } from "@/constants/stalkerPalette";

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

/** Light comes from the upper left: top brightest, +row face mid, +col face darkest. */
const TOP = 1.06;
const LEFT = 0.9;
const RIGHT = 0.78;
const EDGE = 0.62;
const EDGE_ALPHA = 0.55;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function up(p: IsoPoint, h: number): IsoPoint {
  return { x: p.x, y: p.y - h };
}

function poly(g: Graphics, pts: IsoPoint[]): Graphics {
  return g.poly(pts.flatMap((p) => [p.x, p.y]));
}

export interface Box {
  col: number;
  row: number;
  w: number;
  d: number;
  /** Base elevation and height, in screen px. */
  z: number;
  h: number;
  color: number;
}

function faceStroke(g: Graphics, color: number): void {
  g.stroke({
    color: shade(color, EDGE),
    width: 1,
    alpha: EDGE_ALPHA,
    join: "round",
  });
}

export function drawBox(g: Graphics, b: Box): void {
  const { col: c, row: r, w, d, z, h, color } = b;
  const top = z + h;
  const p = (cc: number, rr: number, zz: number) => up(toScreen(cc, rr), zz);

  if (h > 0) {
    // +row face (front-left)
    poly(g, [
      p(c, r + d, z),
      p(c + w, r + d, z),
      p(c + w, r + d, top),
      p(c, r + d, top),
    ]);
    g.fill({ color: shade(color, LEFT) });
    faceStroke(g, color);
    // +col face (front-right)
    poly(g, [
      p(c + w, r, z),
      p(c + w, r + d, z),
      p(c + w, r + d, top),
      p(c + w, r, top),
    ]);
    g.fill({ color: shade(color, RIGHT) });
    faceStroke(g, color);
  }
  poly(g, [
    p(c, r, top),
    p(c + w, r, top),
    p(c + w, r + d, top),
    p(c, r + d, top),
  ]);
  g.fill({ color: shade(color, TOP) });
  faceStroke(g, color);
  if (h > 0) {
    // soft highlight on the two front top edges reads as a rounded bevel
    const left = p(c, r + d, top);
    const front = p(c + w, r + d, top);
    const right = p(c + w, r, top);
    g.moveTo(left.x, left.y + 0.8)
      .lineTo(front.x, front.y + 0.8)
      .lineTo(right.x, right.y + 0.8);
    g.stroke({ color: 0xffffff, width: 1, alpha: 0.45, join: "round" });
  }
}

/** Soft contact shadow so pieces sit on the floor instead of floating. */
function dropShadow(g: Graphics, fp: Footprint): void {
  const grow = 0.06;
  poly(g, [
    toScreen(fp.col - grow, fp.row + grow),
    toScreen(fp.col + fp.w + grow, fp.row + grow),
    toScreen(fp.col + fp.w + grow, fp.row + fp.d + grow * 2),
    toScreen(fp.col - grow, fp.row + fp.d + grow * 2),
  ]);
  g.fill({ color: 0x5b4636, alpha: 0.09 });
}

/** Painter's order for parts of one piece: depth first, then elevation. */
function drawBoxes(g: Graphics, boxes: Box[]): void {
  const key = (b: Box) => (b.col + b.w / 2 + b.row + b.d / 2) * 1000 + b.z;
  for (const box of [...boxes].sort((a, b) => key(a) - key(b))) {
    drawBox(g, box);
  }
}

/** Quad on a box's +row face (`along` = col) or +col face (`along` = row). */
function frontQuad(
  fp: Footprint,
  face: "row" | "col",
  a0: number,
  a1: number,
  h0: number,
  h1: number,
): IsoPoint[] {
  const at = (t: number, zz: number) =>
    face === "row"
      ? up(toScreen(fp.col + t, fp.row + fp.d), zz)
      : up(toScreen(fp.col + fp.w, fp.row + t), zz);
  return [at(a0, h1), at(a1, h1), at(a1, h0), at(a0, h0)];
}

function legs(
  fp: Footprint,
  height: number,
  color: number,
  inset = 0.06,
  size = 0.07,
): Box[] {
  const xs = [fp.col + inset, fp.col + fp.w - inset - size];
  const ys = [fp.row + inset, fp.row + fp.d - inset - size];
  return xs.flatMap((col) =>
    ys.map((row) => ({ col, row, w: size, d: size, z: 0, h: height, color })),
  );
}

function inset(fp: Footprint, m: number): Footprint {
  return { col: fp.col + m, row: fp.row + m, w: fp.w - m * 2, d: fp.d - m * 2 };
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

/** Direction a piece's front faces, in grid terms. */
export type Facing = "+row" | "-row" | "+col" | "-col";

export type FurnitureKind =
  | { kind: "desk"; color: number }
  | { kind: "table"; color: number }
  | { kind: "roundTable"; color: number }
  | { kind: "coffeeTable"; color: number }
  | { kind: "chair"; color: number; facing: Facing }
  | { kind: "bookshelf"; facing: "+row" | "+col"; books: number[] }
  | { kind: "serverRack" }
  | { kind: "sofa"; color: number; facing: Facing }
  | { kind: "rug"; color: number; pattern?: "dots" | "stripes" }
  | { kind: "mug"; z: number; color: number }
  | { kind: "plant"; variant: "leafy" | "cactus" | "flowers" }
  | { kind: "laptop"; z: number }
  | { kind: "tvStand"; color: number }
  | { kind: "tv"; z: number }
  | { kind: "counter"; color: number; sink?: boolean }
  | { kind: "coffeeMaker"; z: number };

const DESK_H = 30;

function drawDesk(g: Graphics, fp: Footprint, color: number): void {
  drawBoxes(g, [
    ...legs(fp, DESK_H - 4, shade(color, 0.8)),
    { ...fp, z: DESK_H - 4, h: 4, color },
  ]);
}

function drawTable(
  g: Graphics,
  fp: Footprint,
  color: number,
  height: number,
): void {
  drawBoxes(g, [
    ...legs(fp, height - 4, shade(color, 0.8), 0.1, 0.08),
    { ...fp, z: height - 4, h: 4, color },
  ]);
}

/** Circle of grid radius R → iso ellipse radii (x = √2·R·TILE_W/2, y = half that). */
function isoEllipse(g: Graphics, center: IsoPoint, radius: number): Graphics {
  return g.ellipse(center.x, center.y, radius * 45.25, radius * 22.6);
}

function drawRoundTable(g: Graphics, fp: Footprint, color: number): void {
  const cc = fp.col + fp.w / 2;
  const cr = fp.row + fp.d / 2;
  const radius = Math.min(fp.w, fp.d) / 2;
  drawBox(g, {
    col: cc - 0.06,
    row: cr - 0.06,
    w: 0.12,
    d: 0.12,
    z: 0,
    h: 22,
    color: shade(color, 0.8),
  });
  const center = up(toScreen(cc, cr), 26);
  isoEllipse(g, up(center, -4), radius);
  g.fill({ color: shade(color, LEFT) });
  isoEllipse(g, center, radius);
  g.fill({ color: shade(color, TOP) });
  g.stroke({ color: shade(color, EDGE), width: 1, alpha: EDGE_ALPHA });
}

function backrest(fp: Footprint, facing: Facing, thickness: number): Footprint {
  switch (facing) {
    case "+row":
      return { ...fp, d: thickness };
    case "-row":
      return { ...fp, row: fp.row + fp.d - thickness, d: thickness };
    case "+col":
      return { ...fp, w: thickness };
    case "-col":
      return { ...fp, col: fp.col + fp.w - thickness, w: thickness };
  }
}

function drawChair(
  g: Graphics,
  fp: Footprint,
  color: number,
  facing: Facing,
): void {
  const seat = inset(fp, 0.08);
  drawBoxes(g, [
    ...legs(seat, 13, shade(color, 0.75), 0.04, 0.06),
    { ...seat, z: 13, h: 4, color },
    { ...backrest(seat, facing, 0.1), z: 17, h: 15, color },
  ]);
}

function drawSofa(
  g: Graphics,
  fp: Footprint,
  color: number,
  facing: Facing,
): void {
  const alongCol = facing === "+row" || facing === "-row";
  const armSize = 0.16;
  const arms: Footprint[] = alongCol
    ? [
        { ...fp, w: armSize },
        { ...fp, col: fp.col + fp.w - armSize, w: armSize },
      ]
    : [
        { ...fp, d: armSize },
        { ...fp, row: fp.row + fp.d - armSize, d: armSize },
      ];
  const back = backrest(fp, facing, 0.22);
  // two plump cushions leaning on the backrest
  const cushions: Box[] = alongCol
    ? [0.25, 0.58].map((t) => ({
        col: fp.col + fp.w * t,
        row: facing === "+row" ? fp.row + 0.22 : fp.row + fp.d - 0.36,
        w: fp.w * 0.2,
        d: 0.14,
        z: 11,
        h: 11,
        color: t < 0.5 ? PALETTE.butter : PALETTE.pink,
      }))
    : [0.25, 0.58].map((t) => ({
        col: facing === "+col" ? fp.col + 0.22 : fp.col + fp.w - 0.36,
        row: fp.row + fp.d * t,
        w: 0.14,
        d: fp.d * 0.2,
        z: 11,
        h: 11,
        color: t < 0.5 ? PALETTE.butter : PALETTE.pink,
      }));
  drawBoxes(g, [
    { ...fp, z: 0, h: 11, color: shade(color, 0.95) },
    { ...back, z: 11, h: 14, color },
    ...arms.map((a) => ({ ...a, z: 11, h: 7, color })),
    ...cushions,
  ]);
}

function drawBookshelf(
  g: Graphics,
  fp: Footprint,
  facing: "+row" | "+col",
  books: number[],
): void {
  const height = 62;
  drawBox(g, { ...fp, z: 0, h: height, color: PALETTE.wood });
  const length = facing === "+row" ? fp.w : fp.d;
  const shelves = [6, 24, 42];
  for (const [si, h0] of shelves.entries()) {
    // dark cavity, then a row of books
    poly(
      g,
      frontQuad(
        fp,
        facing === "+row" ? "row" : "col",
        0.06,
        length - 0.06,
        h0,
        h0 + 15,
      ),
    );
    g.fill({ color: shade(PALETTE.woodDark, 0.8) });
    let t = 0.1;
    let i = si;
    while (t < length - 0.14) {
      const bw = 0.07 + ((i * 37) % 5) * 0.012;
      const bh = 10 + ((i * 53) % 4);
      poly(
        g,
        frontQuad(
          fp,
          facing === "+row" ? "row" : "col",
          t,
          Math.min(t + bw, length - 0.08),
          h0,
          h0 + bh,
        ),
      );
      g.fill({ color: books[i % books.length] });
      t += bw + 0.015;
      i += 1;
    }
  }
}

function drawServerRack(g: Graphics, fp: Footprint, pulse: boolean): void {
  const height = 74;
  drawBox(g, { ...fp, z: 0, h: height, color: PALETTE.rack });
  for (let u = 0; u < 6; u++) {
    const h0 = 8 + u * 11;
    poly(g, frontQuad(fp, "row", 0.08, fp.w - 0.08, h0, h0 + 8));
    g.fill({ color: shade(PALETTE.rack, 1.25) });
    const led = up(toScreen(fp.col + fp.w - 0.18, fp.row + fp.d), h0 + 4);
    g.circle(led.x, led.y, 1.3);
    g.fill({ color: pulse && u % 2 === 0 ? 0xfbbf24 : 0x4ade80 });
  }
}

function drawRug(
  g: Graphics,
  fp: Footprint,
  color: number,
  pattern: "dots" | "stripes" | "plain",
): void {
  const corners = (f: Footprint) => [
    toScreen(f.col, f.row),
    toScreen(f.col + f.w, f.row),
    toScreen(f.col + f.w, f.row + f.d),
    toScreen(f.col, f.row + f.d),
  ];
  poly(g, corners(fp));
  g.fill({ color });
  poly(g, corners(inset(fp, 0.28)));
  g.stroke({ color: shade(color, 1.15), width: 2, alpha: 0.9, join: "round" });
  const inner = inset(fp, 0.5);
  if (pattern === "dots") {
    for (let c = inner.col; c <= inner.col + inner.w + 0.01; c += 0.55) {
      for (let r = inner.row; r <= inner.row + inner.d + 0.01; r += 0.55) {
        const dot = toScreen(c, r);
        g.ellipse(dot.x, dot.y, 4, 2);
      }
    }
    g.fill({ color: 0xffffff, alpha: 0.55 });
  } else if (pattern === "stripes") {
    for (let r = inner.row; r < inner.row + inner.d; r += 0.6) {
      poly(g, corners({ col: inner.col, row: r, w: inner.w, d: 0.22 }));
    }
    g.fill({ color: 0xffffff, alpha: 0.35 });
  }
  poly(g, corners(fp));
  g.stroke({ color: shade(color, EDGE), width: 1, alpha: 0.4, join: "round" });
}

function drawPlant(
  g: Graphics,
  fp: Footprint,
  variant: "leafy" | "cactus" | "flowers",
): void {
  const cc = fp.col + fp.w / 2;
  const cr = fp.row + fp.d / 2;
  const potColor = variant === "cactus" ? PALETTE.potWhite : PALETTE.terracotta;
  drawBox(g, {
    col: cc - 0.17,
    row: cr - 0.17,
    w: 0.34,
    d: 0.34,
    z: 0,
    h: 13,
    color: potColor,
  });
  const base = up(toScreen(cc, cr), 13);

  if (variant === "cactus") {
    g.roundRect(base.x - 5, base.y - 26, 10, 27, 5);
    g.roundRect(base.x - 12, base.y - 18, 6, 10, 3);
    g.roundRect(base.x + 6, base.y - 21, 6, 9, 3);
    g.fill({ color: PALETTE.leaf });
    g.stroke({ color: PALETTE.leafDark, width: 1, alpha: 0.6 });
    return;
  }
  const blobs: [number, number, number][] = [
    [-6, -9, 8],
    [6, -10, 8],
    [0, -17, 9],
    [-3, -5, 7],
    [4, -4, 7],
  ];
  for (const [dx, dy, rr] of blobs) {
    g.circle(base.x + dx, base.y + dy, rr);
  }
  g.fill({ color: PALETTE.leaf });
  g.circle(base.x - 2, base.y - 15, 4);
  g.circle(base.x + 4, base.y - 10, 3);
  g.fill({ color: shade(PALETTE.leaf, 1.15) });
  if (variant === "flowers") {
    for (const [dx, dy, col] of [
      [-6, -14, 0xf472b6],
      [5, -17, 0xfbbf24],
      [1, -8, 0xf9a8d4],
    ] as const) {
      g.circle(base.x + dx, base.y + dy, 2.6);
      g.fill({ color: col });
    }
  }
}

function drawLaptop(g: Graphics, fp: Footprint, z: number): void {
  drawBox(g, { ...fp, z, h: 2, color: PALETTE.gray });
  // screen hinged at the back (-row) edge, facing +row
  const screen: Footprint = { ...fp, d: 0.05 };
  drawBox(g, { ...screen, z: z + 2, h: 13, color: shade(PALETTE.gray, 0.9) });
  poly(g, frontQuad(screen, "row", 0.06, fp.w - 0.06, z + 4, z + 13));
  g.fill({ color: PALETTE.screen });
}

function drawTv(g: Graphics, fp: Footprint, z: number): void {
  const panel: Footprint = { ...fp, d: 0.06 };
  drawBox(g, { ...panel, z: z + 4, h: 30, color: PALETTE.screenDark });
  drawBox(g, {
    col: fp.col + fp.w / 2 - 0.1,
    row: fp.row,
    w: 0.2,
    d: 0.2,
    z,
    h: 4,
    color: PALETTE.screenDark,
  });
  poly(g, frontQuad(panel, "row", 0.06, fp.w - 0.06, z + 7, z + 31));
  g.fill({ color: 0x3b82c4 });
  poly(g, frontQuad(panel, "row", 0.12, fp.w * 0.45, z + 22, z + 29));
  g.fill({ color: 0x7cc0e8, alpha: 0.7 });
}

function drawCounter(
  g: Graphics,
  fp: Footprint,
  color: number,
  sink: boolean,
): void {
  drawBox(g, { ...fp, z: 0, h: 27, color });
  drawBox(g, { ...fp, z: 27, h: 3, color: PALETTE.white });
  // cabinet doors on the +row face
  const doors = 2;
  for (let i = 0; i < doors; i++) {
    const a0 = 0.06 + (i * fp.w) / doors;
    poly(g, frontQuad(fp, "row", a0, a0 + fp.w / doors - 0.12, 4, 23));
    g.stroke({ color: shade(color, 0.7), width: 1, alpha: 0.6 });
  }
  if (sink) {
    const center = up(toScreen(fp.col + fp.w / 2, fp.row + fp.d / 2), 30);
    g.ellipse(center.x, center.y, 12, 5);
    g.fill({ color: PALETTE.metal });
  }
}

function drawMug(g: Graphics, fp: Footprint, z: number, color: number): void {
  const center = up(toScreen(fp.col + fp.w / 2, fp.row + fp.d / 2), z);
  g.roundRect(center.x - 3.5, center.y - 8, 7, 8, 2);
  g.fill({ color });
  g.stroke({ color: shade(color, EDGE), width: 1, alpha: EDGE_ALPHA });
  // start the handle at its own top point, or the arc links back to (0,0)
  g.moveTo(center.x + 3.5, center.y - 6.2);
  g.arc(center.x + 3.5, center.y - 4, 2.2, -Math.PI / 2, Math.PI / 2);
  g.stroke({ color, width: 1.5 });
  g.ellipse(center.x, center.y - 8, 3.5, 1.3);
  g.fill({ color: 0x8b5a3c });
}

function drawCoffeeMaker(g: Graphics, fp: Footprint, z: number): void {
  drawBox(g, { ...fp, z, h: 18, color: 0x4b5563 });
  const light = up(toScreen(fp.col + fp.w * 0.5, fp.row + fp.d), z + 13);
  g.circle(light.x, light.y, 1.4);
  g.fill({ color: 0xf87171 });
}

/** Pieces resting on another surface (or flat on the floor) cast no shadow. */
const FLOATING = new Set<FurnitureKind["kind"]>([
  "rug",
  "laptop",
  "tv",
  "coffeeMaker",
  "mug",
]);

export interface FurnitureDrawOptions {
  /** Server racks blink while Claude is running shell commands. */
  pulse?: boolean;
}

export function drawFurniture(
  g: Graphics,
  fp: Footprint,
  piece: FurnitureKind,
  options: FurnitureDrawOptions = {},
): void {
  g.clear();
  if (!FLOATING.has(piece.kind)) {
    dropShadow(g, fp);
  }
  switch (piece.kind) {
    case "desk":
      return drawDesk(g, fp, piece.color);
    case "table":
      return drawTable(g, fp, piece.color, 26);
    case "coffeeTable":
      return drawTable(g, fp, piece.color, 14);
    case "roundTable":
      return drawRoundTable(g, fp, piece.color);
    case "chair":
      return drawChair(g, fp, piece.color, piece.facing);
    case "sofa":
      return drawSofa(g, fp, piece.color, piece.facing);
    case "bookshelf":
      return drawBookshelf(g, fp, piece.facing, piece.books);
    case "serverRack":
      return drawServerRack(g, fp, options.pulse ?? false);
    case "rug":
      return drawRug(g, fp, piece.color, piece.pattern ?? "plain");
    case "mug":
      return drawMug(g, fp, piece.z, piece.color);
    case "plant":
      return drawPlant(g, fp, piece.variant);
    case "laptop":
      return drawLaptop(g, fp, piece.z);
    case "tvStand":
      return drawTable(g, fp, piece.color, 20);
    case "tv":
      return drawTv(g, fp, piece.z);
    case "counter":
      return drawCounter(g, fp, piece.color, piece.sink ?? false);
    case "coffeeMaker":
      return drawCoffeeMaker(g, fp, piece.z);
  }
}
