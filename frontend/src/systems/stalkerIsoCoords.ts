/**
 * Isometric (2:1) grid math for the Stalker office.
 *
 * One grid unit matches one Buggy furniture unit (~64px wide at scale 1),
 * so furniture sprites can be drawn at native scale and stay crisp.
 * +col runs down-right ("\"), +row runs down-left ("/").
 */
export const TILE_W = 64;
export const TILE_H = 32;

export interface IsoPoint {
  x: number;
  y: number;
}

export interface GridRegion {
  col0: number;
  row0: number;
  col1: number;
  row1: number;
}

/** Axis-aligned footprint in grid units (col/row = back corner). */
export interface Footprint {
  col: number;
  row: number;
  w: number;
  d: number;
}

export function gridToScreen(
  col: number,
  row: number,
  origin: IsoPoint,
): IsoPoint {
  return {
    x: origin.x + (col - row) * (TILE_W / 2),
    y: origin.y + (col + row) * (TILE_H / 2),
  };
}

/** Corners of an inclusive grid rectangle (for zone highlight polygons). */
export function regionToPolygon(
  region: GridRegion,
  origin: IsoPoint,
): IsoPoint[] {
  const { col0, row0, col1, row1 } = region;
  return [
    gridToScreen(col0, row0, origin),
    gridToScreen(col1 + 1, row0, origin),
    gridToScreen(col1 + 1, row1 + 1, origin),
    gridToScreen(col0, row1 + 1, origin),
  ];
}

/**
 * Screen point where a sprite drawn with anchor (0.5, 1) should sit so that
 * its outline matches the footprint: horizontally centred, bottom on the
 * front-most vertex.
 */
export function footprintBase(fp: Footprint, origin: IsoPoint): IsoPoint {
  const left = gridToScreen(fp.col, fp.row + fp.d, origin);
  const right = gridToScreen(fp.col + fp.w, fp.row, origin);
  const bottom = gridToScreen(fp.col + fp.w, fp.row + fp.d, origin);
  return { x: (left.x + right.x) / 2, y: bottom.y };
}

/**
 * Painter's-order key. Sorting by the footprint centre (col + row) keeps
 * wide desks from jumping in front of people standing beside them, which
 * sorting by the front vertex gets wrong.
 */
export function isoDepth(col: number, row: number): number {
  return (col + row) * 100;
}

export function footprintDepth(fp: Footprint): number {
  return isoDepth(fp.col + fp.w / 2, fp.row + fp.d / 2);
}

export function computeIsoOrigin(
  gridCols: number,
  gridRows: number,
  canvasWidth: number,
  canvasHeight: number,
): IsoPoint {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const probe = { x: 0, y: 0 };
  for (let row = 0; row <= gridRows; row++) {
    for (let col = 0; col <= gridCols; col++) {
      const p = gridToScreen(col, row, probe);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }
  const mapW = maxX - minX;
  const mapH = maxY - minY;
  return {
    x: canvasWidth / 2 - mapW / 2 - minX,
    y: canvasHeight / 2 - mapH / 2 - minY + 40,
  };
}

export function gridBoundsScreen(
  gridCols: number,
  gridRows: number,
  origin: IsoPoint,
): { x: number; y: number; w: number; h: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let row = 0; row <= gridRows; row++) {
    for (let col = 0; col <= gridCols; col++) {
      const p = gridToScreen(col, row, origin);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }
  return {
    x: minX - TILE_W,
    y: minY - TILE_H,
    w: maxX - minX + TILE_W * 2,
    h: maxY - minY + TILE_H * 2,
  };
}
