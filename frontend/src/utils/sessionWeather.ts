import type { WhiteboardData } from "@/types";

/** Session health expressed as weather — shared by the whiteboard and the Stalker UI. */
export type WeatherKind = "sunny" | "cloudy" | "rainy" | "stormy";

export interface SessionWeather {
  kind: WeatherKind;
  successRate: number;
  errorCount: number;
}

const STORM_ERROR_COUNT = 5;
const RAIN_SUCCESS_RATE = 0.7;
const CLOUDY_ACTIVITY = 0.3;

export const WEATHER_ICONS: Record<WeatherKind, string> = {
  sunny: "☀️",
  cloudy: "⛅",
  rainy: "🌧️",
  stormy: "⛈️",
};

export function getSessionWeather(data: WhiteboardData): SessionWeather {
  const successes = data.recentSuccessCount ?? 0;
  const errorCount = data.recentErrorCount ?? 0;
  const total = successes + errorCount;
  const successRate = total > 0 ? successes / total : 1;
  const activity = data.activityLevel ?? 0;

  const kind: WeatherKind =
    errorCount > STORM_ERROR_COUNT
      ? "stormy"
      : successRate < RAIN_SUCCESS_RATE
        ? "rainy"
        : activity < CLOUDY_ACTIVITY
          ? "cloudy"
          : "sunny";

  return { kind, successRate, errorCount };
}
