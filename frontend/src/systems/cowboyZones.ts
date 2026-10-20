/**
 * Canvas-space zone anchors for Claude Stalker HUD (maps to office layout).
 */
import {
  PRINTER_STATION_POSITION,
  SAFETY_SIGN_POSITION,
  WHITEBOARD_POSITION,
  WATER_COOLER_POSITION,
  BOSS_RUG_POSITION,
  CITY_WINDOW_POSITION,
} from "@/constants/positions";

export type CowboyZoneKey =
  | "archive"
  | "dev"
  | "server"
  | "research"
  | "meeting"
  | "user_desk"
  | "boss_desk";

export const COWBOY_ZONE_ANCHORS: Record<
  CowboyZoneKey,
  { x: number; y: number; label: string }
> = {
  archive: {
    x: PRINTER_STATION_POSITION.x,
    y: PRINTER_STATION_POSITION.y,
    label: "자료실",
  },
  dev: { x: 512, y: 480, label: "개발실" },
  server: {
    x: SAFETY_SIGN_POSITION.x,
    y: SAFETY_SIGN_POSITION.y,
    label: "서버실",
  },
  research: {
    x: CITY_WINDOW_POSITION.x,
    y: CITY_WINDOW_POSITION.y,
    label: "정보검색실",
  },
  meeting: {
    x: WHITEBOARD_POSITION.x,
    y: WHITEBOARD_POSITION.y,
    label: "회의실",
  },
  user_desk: {
    x: WATER_COOLER_POSITION.x,
    y: WATER_COOLER_POSITION.y,
    label: "내 책상",
  },
  boss_desk: { x: BOSS_RUG_POSITION.x, y: BOSS_RUG_POSITION.y, label: "보스" },
};
