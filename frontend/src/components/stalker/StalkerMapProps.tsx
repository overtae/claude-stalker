"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useTick } from "@pixi/react";
import type { Graphics, Text } from "pixi.js";
import { useShallow } from "zustand/react/shallow";
import {
  useGameStore,
  selectAgents,
  selectEventLog,
  selectWhiteboardData,
} from "@/stores/gameStore";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/i18n";
import {
  FURNITURE_SCALE,
  OFFICE_FURNITURE,
  toScreen,
} from "@/constants/stalkerFloorLayout";
import {
  WHITEBOARD_QUAD,
  poly,
  rightWallQuad,
} from "@/systems/stalkerOfficeDraw";
import { StalkerPill } from "@/components/stalker/StalkerPixiBits";
import { getSessionWeather, WEATHER_ICONS } from "@/utils/sessionWeather";
import { CLAUDE_COLOR, agentColor } from "@/utils/stalkerFormat";

const OUTLINE = 0x3a3330;
/** Wall props sit just above the static shell, below furniture. */
const Z_WALL_PROPS = -950;
const Z_LABEL = 100000;

// ---------------------------------------------------------------------------
// Whiteboard hotspot
// ---------------------------------------------------------------------------

export function WhiteboardHotspot({ onOpen }: { onOpen: () => void }): ReactNode {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);
  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      poly(g, WHITEBOARD_QUAD);
      // near-invisible fill keeps the whole board clickable
      g.fill({ color: 0x14b8a6, alpha: hover ? 0.12 : 0.001 });
      if (hover) {
        poly(g, WHITEBOARD_QUAD);
        g.stroke({ color: 0x14b8a6, width: 3, alpha: 0.9, join: "round" });
      }
    },
    [hover],
  );
  const top = WHITEBOARD_QUAD[0];
  const topEnd = WHITEBOARD_QUAD[1];

  return (
    <>
      <pixiGraphics
        draw={draw}
        zIndex={Z_WALL_PROPS + 5}
        eventMode="static"
        cursor="pointer"
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        onPointerTap={onOpen}
      />
      {hover && (
        <StalkerPill
          text={`📋 ${t("stalker.whiteboardHint")}`}
          x={(top.x + topEnd.x) / 2}
          y={Math.min(top.y, topEnd.y) - 14}
          zIndex={Z_LABEL}
          tone="active"
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Coffee cups on the cafe counter
// ---------------------------------------------------------------------------

const COUNTER = OFFICE_FURNITURE.find((f) => f.id === "cafe-counter");
const MAX_CUPS_SHOWN = 3;
/** Counter-top height above the floor (native px × furniture scale). */
const COUNTER_TOP = 42 * FURNITURE_SCALE;

export function CoffeeCups(): ReactNode {
  const { t } = useTranslation();
  const cups = useGameStore((s) => s.whiteboardData.coffeeCups ?? 0);
  const shown = Math.min(cups, MAX_CUPS_SHOWN);

  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      if (!COUNTER) {
        return;
      }
      for (let i = 0; i < shown; i++) {
        const p = toScreen(COUNTER.fp.col + COUNTER.fp.w - 0.25 - i * 0.22, COUNTER.fp.row + COUNTER.fp.d / 2);
        const x = p.x;
        const y = p.y - COUNTER_TOP;
        g.roundRect(x - 3.5, y - 8, 7, 8, 2);
        g.fill({ color: 0xffffff });
        g.stroke({ color: OUTLINE, width: 1.2 });
        g.ellipse(x, y - 8, 3.5, 1.4);
        g.fill({ color: 0x7c4a2d });
      }
    },
    [shown],
  );

  if (!COUNTER || cups === 0) {
    return null;
  }
  const label = toScreen(COUNTER.fp.col + COUNTER.fp.w / 2, COUNTER.fp.row);
  return (
    <>
      <pixiGraphics draw={draw} zIndex={COUNTER.z + 2} />
      <StalkerPill
        text={`☕ ${t("stalker.coffeeCups", { count: cups })}`}
        x={label.x}
        y={label.y - COUNTER_TOP - 26}
        zIndex={Z_LABEL - 1}
        fontSize={10}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Employee of the month — framed portrait between the dev-room windows
// ---------------------------------------------------------------------------

const FRAME = { a: 9.5, b: 10.35, h0: 58, h1: 116 };

/** Most active actor in the event log (Claude counts as "main"). */
function useEmployeeOfMonth(): { name: string; color: number } {
  const { t } = useTranslation();
  const eventLog = useGameStore(selectEventLog);
  const agents = useGameStore(useShallow(selectAgents));

  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of eventLog) {
      if (event.agentId && agents.has(event.agentId)) {
        counts.set(event.agentId, (counts.get(event.agentId) ?? 0) + 1);
      }
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const agent = top ? agents.get(top[0]) : undefined;
    if (!agent) {
      return { name: t("stalker.claude"), color: CLAUDE_COLOR };
    }
    return {
      name: agent.name ?? `${t("agentStatus.agent")} #${agent.number}`,
      color: agentColor(agent.number),
    };
  }, [eventLog, agents, t]);
}

export function EmployeeFrame(): ReactNode {
  const winner = useEmployeeOfMonth();

  const draw = useCallback(
    (g: Graphics) => {
      const { a, b, h0, h1 } = FRAME;
      g.clear();
      poly(g, rightWallQuad(a, b, h0, h1));
      g.fill({ color: 0xfaf3e3 });
      g.stroke({ color: 0x8b6b4a, width: 2.5, join: "round" });
      poly(g, rightWallQuad(a + 0.06, b - 0.06, h1 - 12, h1 - 4));
      g.fill({ color: 0x334155 });
      // tiny Clawd portrait
      const mid = (a + b) / 2;
      poly(g, rightWallQuad(mid - 0.2, mid + 0.2, h0 + 16, h0 + 34));
      g.fill({ color: winner.color });
      for (const dx of [-0.09, 0.07]) {
        poly(g, rightWallQuad(mid + dx, mid + dx + 0.04, h0 + 26, h0 + 31));
      }
      g.fill({ color: 0x1c1917 });
      // gold star
      const star = toScreen(mid, 0);
      g.star(star.x, star.y - h0 - 8, 5, 4, 2);
      g.fill({ color: 0xfbbf24 });
    },
    [winner.color],
  );

  const pillAt = toScreen((FRAME.a + FRAME.b) / 2, 0);
  return (
    <>
      <pixiGraphics draw={draw} zIndex={Z_WALL_PROPS} />
      <StalkerPill
        text={`🏆 ${winner.name}`}
        x={pillAt.x}
        y={pillAt.y - FRAME.h1 - 12}
        zIndex={Z_WALL_PROPS + 1}
        fontSize={9}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// LED news ticker above the server racks
// ---------------------------------------------------------------------------

const TICKER = { a: 14.3, b: 19.7, top: 146, height: 14 };
/** atan(TILE_H / TILE_W): the slope of the row=0 wall on screen. */
const WALL_SLOPE = Math.atan(0.5);
const TICKER_SPEED = 0.6;

export function NewsTicker(): ReactNode {
  const { t } = useTranslation();
  const whiteboard = useGameStore(selectWhiteboardData);
  const textRef = useRef<Text | null>(null);

  const message = useMemo(() => {
    const news = whiteboard.newsItems ?? [];
    if (news.length > 0) {
      return news.map((n) => `📰 ${n.headline}`).join("     ·     ");
    }
    const weather = getSessionWeather(whiteboard);
    return `${WEATHER_ICONS[weather.kind]} ${t(`stalker.weather.${weather.kind}` as TranslationKey)} · ${t(
      "stalker.successRate",
      { pct: Math.round(weather.successRate * 100) },
    )}`;
  }, [whiteboard, t]);

  const start = toScreen(TICKER.a, 0);
  const width = (TICKER.b - TICKER.a) * 32;

  useTick((ticker) => {
    const text = textRef.current;
    if (!text) {
      return;
    }
    text.x -= TICKER_SPEED * ticker.deltaTime;
    if (text.x < -text.width) {
      text.x = width;
    }
  });

  const drawBoard = useCallback(
    (g: Graphics) => {
      g.clear();
      g.roundRect(-3, -2, width + 6, TICKER.height + 4, 3);
      g.fill({ color: 0x1f2937 });
      g.stroke({ color: OUTLINE, width: 1.5 });
    },
    [width],
  );
  const drawMask = useCallback(
    (g: Graphics) => {
      g.clear();
      g.rect(0, 0, width, TICKER.height);
      g.fill({ color: 0xffffff });
    },
    [width],
  );
  const [mask, setMask] = useState<Graphics | null>(null);

  return (
    <pixiContainer x={start.x} y={start.y - TICKER.top} skew={{ x: 0, y: WALL_SLOPE }} zIndex={Z_WALL_PROPS}>
      <pixiGraphics draw={drawBoard} />
      <pixiGraphics draw={drawMask} ref={setMask} />
      <pixiText
        ref={textRef}
        text={message}
        x={width}
        y={1}
        mask={mask}
        resolution={2}
        style={{ fontFamily: "Pretendard, system-ui, sans-serif", fontSize: 10, fontWeight: "700", fill: 0xfbbf24 }}
      />
    </pixiContainer>
  );
}
