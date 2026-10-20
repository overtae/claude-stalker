import { describe, expect, it } from "vitest";
import { getSessionWeather } from "../src/utils/sessionWeather";
import { skyPhase } from "../src/systems/stalkerOfficeDraw";

describe("getSessionWeather", () => {
  it("is sunny for a busy, healthy session", () => {
    const w = getSessionWeather({
      recentSuccessCount: 9,
      recentErrorCount: 1,
      activityLevel: 0.8,
    });
    expect(w.kind).toBe("sunny");
    expect(w.successRate).toBeCloseTo(0.9);
  });

  it("is cloudy when quiet", () => {
    expect(getSessionWeather({ activityLevel: 0.1 }).kind).toBe("cloudy");
  });

  it("rains when success rate drops below 70%", () => {
    expect(
      getSessionWeather({
        recentSuccessCount: 3,
        recentErrorCount: 2,
        activityLevel: 1,
      }).kind,
    ).toBe("rainy");
  });

  it("storms on many errors", () => {
    expect(
      getSessionWeather({ recentSuccessCount: 50, recentErrorCount: 6 }).kind,
    ).toBe("stormy");
  });

  it("treats no data as a perfect success rate", () => {
    expect(getSessionWeather({}).successRate).toBe(1);
  });
});

describe("skyPhase", () => {
  const at = (h: number) => new Date(2026, 0, 1, h, 30);

  it("maps local hours to day, dusk and night", () => {
    expect(skyPhase(at(12))).toBe("day");
    expect(skyPhase(at(18))).toBe("dusk");
    expect(skyPhase(at(6))).toBe("dusk");
    expect(skyPhase(at(23))).toBe("night");
    expect(skyPhase(at(3))).toBe("night");
  });
});
