"use client";

import { useMemo } from "react";
import type { Texture } from "pixi.js";
import {
  FREE_ISO_FLOOR_ACCENTS,
  FREE_ISO_PROPS,
  type FreeIsoProp,
} from "@/constants/freeIsoDecor";
import { useGameStore } from "@/stores/gameStore";

interface FreeIsoZoneDecorProps {
  textures: Map<string, Texture>;
}

function propAlpha(
  prop: FreeIsoProp,
  activityZone: string | null,
  serverRackPulse: boolean,
): number {
  if (prop.zone === "elevator") {
    return 0.85;
  }
  if (prop.zone === "boss_desk") {
    return 0.45;
  }
  const active = activityZone === prop.zone;
  if (prop.zone === "server" && serverRackPulse) {
    return 1;
  }
  if (active) {
    return 1;
  }
  return 0.5;
}

export function FreeIsoZoneDecor({ textures }: FreeIsoZoneDecorProps) {
  const activityZone = useGameStore((s) => s.activityZone);
  const serverRackPulse = useGameStore((s) => s.serverRackPulse);

  const items = useMemo(
    () => [...FREE_ISO_FLOOR_ACCENTS, ...FREE_ISO_PROPS],
    [],
  );

  return (
    <>
      {items.map((prop) => {
        const texture = textures.get(prop.texturePath);
        if (!texture) {
          return null;
        }
        const alpha = propAlpha(prop, activityZone, serverRackPulse);
        return (
          <pixiSprite
            key={prop.id}
            texture={texture}
            x={prop.x}
            y={prop.y}
            anchor={{ x: prop.anchorX, y: prop.anchorY }}
            scale={prop.scale}
            alpha={alpha}
            zIndex={prop.y - 1}
          />
        );
      })}
    </>
  );
}
