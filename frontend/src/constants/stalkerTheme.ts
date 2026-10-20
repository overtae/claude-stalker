import type { UiTheme } from "@/stores/preferencesStore";

export type StalkerThemeTokens = {
  pageBg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  dangerSoft: string;
  danger: string;
  shadow: string;
};

const light: StalkerThemeTokens = {
  pageBg: "#e8eef4",
  surface: "rgba(255,255,255,0.95)",
  border: "rgb(226 232 240)",
  text: "rgb(30 41 59)",
  textMuted: "rgb(100 116 139)",
  accent: "#d97757",
  accentSoft: "#fdf4f0",
  dangerSoft: "rgb(255 241 242)",
  danger: "rgb(190 18 60)",
  shadow: "0 4px 24px rgba(15, 23, 42, 0.08)",
};

const dark: StalkerThemeTokens = {
  pageBg: "#0a0a0a",
  surface: "rgba(23, 23, 23, 0.95)",
  border: "rgb(64 64 64)",
  text: "rgb(245 245 245)",
  textMuted: "rgb(163 163 163)",
  accent: "#d97757",
  accentSoft: "rgb(38 38 38)",
  dangerSoft: "rgb(64 24 32)",
  danger: "rgb(251 113 133)",
  shadow: "0 4px 24px rgba(0, 0, 0, 0.35)",
};

export const stalkerThemes: Record<UiTheme, StalkerThemeTokens> = {
  light,
  dark,
};

/** @deprecated Prefer `useStalkerTheme()` for theme-aware inline styles. */
export const stalkerTheme = light;

/** Tailwind classes for glass side panels */
export const stalkerGlassPanel =
  "rounded-2xl border border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-md dark:border-neutral-700/80 dark:bg-neutral-900/85";

/** Pixi / CSS fill behind the isometric office map */
export const STALKER_MAP_BG: Record<UiTheme, number> = {
  light: 0xeef2f6,
  dark: 0x262626,
};

export const STALKER_MAP_BG_CSS: Record<UiTheme, string> = {
  light: "#eef2f6",
  dark: "#262626",
};
