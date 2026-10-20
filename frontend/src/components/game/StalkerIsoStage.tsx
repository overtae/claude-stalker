"use client";

import { useCallback, useMemo } from "react";
import { Graphics, type Texture } from "pixi.js";
import {
  STALKER_ISO_STAGE,
  STALKER_ISO_STAGE_FLOORS,
  STALKER_ISO_STAGE_PROPS,
  type FreeIsoProp,
} from "@/constants/freeIsoDecor";
import { COWBOY_ZONE_ANCHORS } from "@/systems/cowboyZones";
import { useGameStore } from "@/stores/gameStore";

const ZONE_LABELS: { zone: FreeIsoProp["zone"]; text: string }[] = [
  { zone: "archive", text: "자료실" },
  { zone: "dev", text: "개발실" },
  { zone: "server", text: "서버실" },
  { zone: "research", text: "정보검색" },
  { zone: "meeting", text: "회의실" },
  { zone: "user_desk", text: "내 책상" },
];

interface StalkerIsoStageProps {
  textures: Map<string, Texture>;
}

function propAlpha(
  prop: FreeIsoProp,
  activityZone: string | null,
  serverRackPulse: boolean,
): number {
  if (prop.zone === "elevator") {
    return 0.9;
  }
  if (prop.zone === "boss_desk") {
    return 0.35;
  }
  const active = activityZone === prop.zone;
  if (prop.zone === "server" && serverRackPulse) {
    return 1;
  }
  if (active) {
    return 1;
  }
  return 0.55;
}

export function StalkerIsoStage({ textures }: StalkerIsoStageProps) {
  const activityZone = useGameStore((s) => s.activityZone);
  const serverRackPulse = useGameStore((s) => s.serverRackPulse);

  const drawStage = useCallback((g: Graphics) => {
    g.clear();
    const { x, y, width, height } = STALKER_ISO_STAGE;
    g.roundRect(x, y, width, height, 20);
    g.fill({ color: 0xf1f5f9, alpha: 1 });
    g.stroke({ color: 0x94a3b8, width: 2, alpha: 0.8 });

    // 아이소 바닥 판 느낌 (대각선 플레이트)
    g.moveTo(x + 80, y + height - 40);
    g.lineTo(x + width - 60, y + 120);
    g.lineTo(x + width - 40, y + height - 50);
    g.lineTo(x + 60, y + height - 20);
    g.closePath();
    g.fill({ color: 0xe2e8f0, alpha: 0.85 });
    g.stroke({ color: 0xcbd5e1, width: 1 });
  }, []);

  const items = useMemo(
    () => [...STALKER_ISO_STAGE_FLOORS, ...STALKER_ISO_STAGE_PROPS],
    [],
  );

  return (
    <pixiContainer zIndex={9000} sortableChildren={true}>
      <pixiGraphics draw={drawStage} zIndex={0} />
      {ZONE_LABELS.map(({ zone, text }) => {
        const prop = STALKER_ISO_STAGE_PROPS.find((p) => p.zone === zone);
        if (!prop) {
          return null;
        }
        const active = activityZone === zone;
        return (
          <pixiText
            key={`label-${zone}`}
            text={text}
            x={prop.x - 28}
            y={prop.y - 8}
            zIndex={prop.y + 2}
            style={{
              fontFamily: "system-ui, sans-serif",
              fontSize: 11,
              fontWeight: active ? "700" : "600",
              fill: active ? 0x0f766e : 0x64748b,
            }}
          />
        );
      })}
      <pixiText
        text="▲ 3F · 활동 맵 (B안 아이소)"
        x={STALKER_ISO_STAGE.x + 16}
        y={STALKER_ISO_STAGE.y + 12}
        zIndex={10000}
        style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 12,
          fontWeight: "600",
          fill: 0x334155,
        }}
      />
      {items.map((prop) => {
        const texture = textures.get(prop.texturePath);
        if (!texture) {
          return null;
        }
        const alpha = propAlpha(prop, activityZone, serverRackPulse);
        const active = activityZone === prop.zone;
        return (
          <pixiSprite
            key={prop.id}
            texture={texture}
            x={prop.x}
            y={prop.y}
            anchor={{ x: prop.anchorX, y: prop.anchorY }}
            scale={active ? prop.scale * 1.06 : prop.scale}
            alpha={alpha}
            zIndex={prop.y}
          />
        );
      })}
      {activityZone &&
        COWBOY_ZONE_ANCHORS[
          activityZone as keyof typeof COWBOY_ZONE_ANCHORS
        ] && (
          <pixiText
            text={`지금: ${COWBOY_ZONE_ANCHORS[activityZone as keyof typeof COWBOY_ZONE_ANCHORS].label}`}
            x={STALKER_ISO_STAGE.x + 16}
            y={STALKER_ISO_STAGE.y + STALKER_ISO_STAGE.height - 28}
            zIndex={10001}
            style={{
              fontFamily: "system-ui, sans-serif",
              fontSize: 13,
              fontWeight: "700",
              fill: 0x0d9488,
            }}
          />
        )}
    </pixiContainer>
  );
}
