/** B안 (Cozy Isometric) — Shell·패널 공통 토큰 */
export const stalkerTheme = {
  pageBg: "#e8eef4",
  surface: "rgba(255,255,255,0.95)",
  border: "rgb(226 232 240)",
  text: "rgb(30 41 59)",
  textMuted: "rgb(100 116 139)",
  accent: "rgb(13 148 136)",
  accentSoft: "rgb(240 253 250)",
  dangerSoft: "rgb(255 241 242)",
  danger: "rgb(190 18 60)",
  shadow: "0 4px 24px rgba(15, 23, 42, 0.08)",
} as const;

/** Tailwind classes for glass side panels */
export const stalkerGlassPanel =
  "rounded-2xl border border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-md";
