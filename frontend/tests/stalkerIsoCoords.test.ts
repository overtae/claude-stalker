import { describe, expect, it } from "vitest";
import { gridToScreen, regionToPolygon } from "../src/systems/stalkerIsoCoords";

describe("stalkerIsoCoords", () => {
  const origin = { x: 400, y: 200 };

  it("maps grid to diagonal screen axes", () => {
    const a = gridToScreen(0, 0, origin);
    const b = gridToScreen(1, 0, origin);
    const c = gridToScreen(0, 1, origin);
    expect(b.x).toBeGreaterThan(a.x);
    expect(c.x).toBeLessThan(a.x);
    expect(b.y).toBeGreaterThan(a.y);
    expect(c.y).toBeGreaterThan(a.y);
  });

  it("builds a 4-point polygon for regions", () => {
    const poly = regionToPolygon(
      { col0: 2, row0: 3, col1: 4, row1: 5 },
      origin,
    );
    expect(poly).toHaveLength(4);
  });
});
