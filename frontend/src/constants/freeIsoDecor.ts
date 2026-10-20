import type { CowboyZoneKey } from "@/systems/cowboyZones";

export interface FreeIsoProp {
  id: string;
  zone: CowboyZoneKey | "elevator" | "boss_desk";
  texturePath: string;
  x: number;
  y: number;
  scale: number;
  anchorX: number;
  anchorY: number;
}

/** 하단 B안 스테이지 (캔버스 y≈600~980) — 여기가 메인 연출 */
export const STALKER_ISO_STAGE = {
  x: 24,
  y: 600,
  width: 1232,
  height: 400,
};

export const STALKER_ISO_STAGE_PROPS: FreeIsoProp[] = [
  {
    id: "stage-archive",
    zone: "archive",
    texturePath: "/assets/free-iso/archive-bookcase.png",
    x: STALKER_ISO_STAGE.x + 140,
    y: STALKER_ISO_STAGE.y + 300,
    scale: 0.38,
    anchorX: 0.5,
    anchorY: 1,
  },
  {
    id: "stage-dev",
    zone: "dev",
    texturePath: "/assets/free-iso/dev-desk.png",
    x: STALKER_ISO_STAGE.x + 320,
    y: STALKER_ISO_STAGE.y + 290,
    scale: 0.42,
    anchorX: 0.5,
    anchorY: 1,
  },
  {
    id: "stage-server",
    zone: "server",
    texturePath: "/assets/free-iso/server-rack.png",
    x: STALKER_ISO_STAGE.x + 500,
    y: STALKER_ISO_STAGE.y + 300,
    scale: 0.45,
    anchorX: 0.5,
    anchorY: 1,
  },
  {
    id: "stage-research",
    zone: "research",
    texturePath: "/assets/free-iso/research-terminal.png",
    x: STALKER_ISO_STAGE.x + 680,
    y: STALKER_ISO_STAGE.y + 290,
    scale: 0.4,
    anchorX: 0.5,
    anchorY: 1,
  },
  {
    id: "stage-meeting",
    zone: "meeting",
    texturePath: "/assets/free-iso/meeting-table.png",
    x: STALKER_ISO_STAGE.x + 860,
    y: STALKER_ISO_STAGE.y + 310,
    scale: 0.36,
    anchorX: 0.5,
    anchorY: 1,
  },
  {
    id: "stage-user",
    zone: "user_desk",
    texturePath: "/assets/free-iso/user-desk.png",
    x: STALKER_ISO_STAGE.x + 1020,
    y: STALKER_ISO_STAGE.y + 285,
    scale: 0.4,
    anchorX: 0.5,
    anchorY: 1,
  },
  {
    id: "stage-elevator",
    zone: "elevator",
    texturePath: "/assets/free-iso/elevator-corridor.png",
    x: STALKER_ISO_STAGE.x + 1120,
    y: STALKER_ISO_STAGE.y + 200,
    scale: 0.35,
    anchorX: 0.5,
    anchorY: 1,
  },
];

export const STALKER_ISO_STAGE_FLOORS: FreeIsoProp[] = [
  {
    id: "stage-floor-1",
    zone: "boss_desk",
    texturePath: "/assets/free-iso/floor-accent.png",
    x: STALKER_ISO_STAGE.x + 280,
    y: STALKER_ISO_STAGE.y + 340,
    scale: 0.22,
    anchorX: 0.5,
    anchorY: 1,
  },
  {
    id: "stage-floor-2",
    zone: "boss_desk",
    texturePath: "/assets/free-iso/floor-accent.png",
    x: STALKER_ISO_STAGE.x + 520,
    y: STALKER_ISO_STAGE.y + 360,
    scale: 0.22,
    anchorX: 0.5,
    anchorY: 1,
  },
  {
    id: "stage-floor-3",
    zone: "boss_desk",
    texturePath: "/assets/free-iso/floor-accent.png",
    x: STALKER_ISO_STAGE.x + 760,
    y: STALKER_ISO_STAGE.y + 340,
    scale: 0.22,
    anchorX: 0.5,
    anchorY: 1,
  },
];

/** @deprecated 스테이지 모드에서는 미사용 */
export const FREE_ISO_PROPS: FreeIsoProp[] = STALKER_ISO_STAGE_PROPS;
export const FREE_ISO_FLOOR_ACCENTS: FreeIsoProp[] = STALKER_ISO_STAGE_FLOORS;
