"use client";

import { Application, extend } from "@pixi/react";
import {
  Container,
  Graphics,
  Sprite,
  Text,
  Application as PixiApplication,
} from "pixi.js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import { useBuggyTextures } from "@/hooks/useBuggyTextures";
import { useAnimationSystem } from "@/systems/animationSystem";
import { wireGameRuntime, unwireGameRuntime } from "@/systems/gameRuntime";
import { performSoftReset, getHmrVersion } from "@/systems/hmrCleanup";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/constants/canvas";
import {
  DEV_SEATS,
  OFFICE_FURNITURE,
  OFFICE_ROOMS,
  USER_SEAT,
  WALK_POINTS,
  getZoneRegion,
  resolveWalkZone,
  toScreen,
  type GridPoint,
} from "@/constants/stalkerFloorLayout";
import { useGameStore, selectAgents, selectBoss } from "@/stores/gameStore";
import { useShallow } from "zustand/react/shallow";
import type { AgentAnimationState } from "@/stores/gameStore";
import { StalkerSpeechOverlays } from "@/components/stalker/StalkerSpeechOverlays";
import { StalkerZoomControls } from "@/components/stalker/StalkerZoomControls";
import {
  CHIBI_BUBBLE_OFFSET,
  StalkerChibi,
  StalkerPill,
} from "@/components/stalker/StalkerPixiBits";
import { isoDepth } from "@/systems/stalkerIsoCoords";
import {
  drawOfficeShell,
  drawZoneHighlight,
  roomLabelPoint,
} from "@/systems/stalkerOfficeDraw";
import { useTranslation } from "@/hooks/useTranslation";
import {
  CoffeeCups,
  EmployeeFrame,
  NewsTicker,
  WhiteboardHotspot,
} from "@/components/stalker/StalkerMapProps";
import { StalkerWhiteboard } from "@/components/stalker/StalkerWhiteboard";
import { CLAUDE_COLOR, agentColor } from "@/utils/stalkerFormat";

extend({ Container, Graphics, Sprite, Text });

const BOSS_LERP = 0.08;
const USER_COLOR = 0x94a3b8;
const NAME_MAX = 12;
const FIT_PADDING = 1.08;
const FIT_ANIMATION_MS = 250;
const MINUTE_MS = 60_000;
const CLOCK_POLL_MS = 10_000;

/** zIndex bands: shell < rugs < zone glow < furniture/people < labels */
const Z_SHELL = -1000;
const Z_ZONE_GLOW = -400;
const Z_LABEL = 100000;

const ELEVATOR_PHASES = new Set([
  "walking_to_elevator",
  "in_elevator",
  "in_departure_queue",
  "departing",
]);

function agentGridPosition(
  agent: AgentAnimationState,
  index: number,
): GridPoint {
  if (ELEVATOR_PHASES.has(agent.phase)) {
    const e = WALK_POINTS.elevator;
    return { col: e.col + (index % 3) * 0.7, row: e.row - 0.6 + Math.floor(index / 3) * 0.7 };
  }
  if (index < DEV_SEATS.length) {
    return DEV_SEATS[index];
  }
  const overflow = index - DEV_SEATS.length;
  const lobby = WALK_POINTS.lobby;
  return { col: lobby.col - 1.5 + (overflow % 4) * 0.8, row: lobby.row + 1 + Math.floor(overflow / 4) * 0.8 };
}

/** Epoch ms floored to the minute; re-renders once a minute for the wall clock. */
function useMinuteClock(): number {
  const floorMinute = () => Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
  const [minute, setMinute] = useState(floorMinute);
  useEffect(() => {
    const id = setInterval(() => setMinute(floorMinute()), CLOCK_POLL_MS);
    return () => clearInterval(id);
  }, []);
  return minute;
}

function shortName(agent: AgentAnimationState): string {
  const raw = agent.name ?? `#${agent.number}`;
  return raw.length > NAME_MAX ? `${raw.slice(0, NAME_MAX)}…` : raw;
}

export function StalkerGameCanvas(): ReactNode {
  const { t } = useTranslation();
  const appRef = useRef<PixiApplication | null>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hmrVersion = getHmrVersion();
  const { textures, loaded, missingCount } = useBuggyTextures();

  useAnimationSystem();
  useEffect(() => {
    wireGameRuntime();
    return () => {
      unwireGameRuntime();
      appRef.current = null;
      performSoftReset();
    };
  }, []);

  // Fit the whole floor into the panel and keep it centred on resize.
  const fitToView = useCallback((animationMs = 0) => {
    const el = viewportRef.current;
    if (!el) {
      return;
    }
    const { width, height } = el.getBoundingClientRect();
    if (width === 0 || height === 0) {
      return;
    }
    const scale =
      Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT) * FIT_PADDING;
    transformRef.current?.setTransform(
      (width - CANVAS_WIDTH * scale) / 2,
      (height - CANVAS_HEIGHT * scale) / 2,
      scale,
      animationMs,
    );
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) {
      return;
    }
    fitToView();
    const observer = new ResizeObserver(() => fitToView());
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitToView]);

  const activityZone = useGameStore((s) => s.activityZone);
  const serverRackPulse = useGameStore((s) => s.serverRackPulse);
  const agents = useGameStore(useShallow(selectAgents));
  const boss = useGameStore(selectBoss);

  const walkZone = resolveWalkZone(activityZone);
  const target = WALK_POINTS[walkZone];
  const [bossGrid, setBossGrid] = useState<GridPoint>(() => WALK_POINTS.lobby);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setBossGrid((prev) => {
        const dc = target.col - prev.col;
        const dr = target.row - prev.row;
        if (Math.abs(dc) < 0.01 && Math.abs(dr) < 0.01) {
          return prev === target ? prev : target;
        }
        return { col: prev.col + dc * BOSS_LERP, row: prev.row + dr * BOSS_LERP };
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const bossPos = toScreen(bossGrid.col, bossGrid.row);
  const userPos = toScreen(USER_SEAT.col, USER_SEAT.row);

  const drawBackdrop = useCallback((g: Graphics) => {
    g.clear();
    g.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    g.fill({ color: 0xeef2f6 });
  }, []);

  const agentList = useMemo(() => Array.from(agents.values()), [agents]);

  const placedAgents = useMemo(
    () =>
      agentList.map((agent, i) => {
        const grid = agentGridPosition(agent, i);
        const pos = toScreen(grid.col, grid.row);
        return { agent, grid, x: pos.x, y: pos.y };
      }),
    [agentList],
  );

  const overlayAgents = useMemo(
    () =>
      placedAgents.map(({ agent, x, y }) => ({
        id: agent.id,
        bubble: agent.bubble.content,
        x,
        y: y - CHIBI_BUBBLE_OFFSET,
      })),
    [placedAgents],
  );

  const [isWhiteboardOpen, setWhiteboardOpen] = useState(false);
  const openWhiteboard = useCallback(() => setWhiteboardOpen(true), []);
  const closeWhiteboard = useCallback(() => setWhiteboardOpen(false), []);

  const minute = useMinuteClock();
  const drawShell = useCallback(
    (g: Graphics) => drawOfficeShell(g, new Date(minute)),
    [minute],
  );

  const drawActiveZone = useCallback(
    (g: Graphics) => drawZoneHighlight(g, getZoneRegion(walkZone)),
    [walkZone],
  );

  const assetBanner =
    loaded && missingCount > 0
      ? textures.size === 0
        ? t("stalker.assetError")
        : t("stalker.assetPartial", { count: missingCount })
      : null;

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full overflow-hidden bg-[#eef2f6]"
    >
      {assetBanner && (
        <p className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900">
          {assetBanner}
        </p>
      )}
      {isWhiteboardOpen && <StalkerWhiteboard onClose={closeWhiteboard} />}
      <p className="pointer-events-none absolute bottom-3 right-4 z-20 text-[11px] text-slate-400">
        {t("stalker.zoomHint")}
      </p>
      <div
        className="absolute inset-0"
        onDoubleClick={() => fitToView(FIT_ANIMATION_MS)}
      >
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.4}
        maxScale={2.5}
        centerZoomedOut={false}
        limitToBounds={false}
        wheel={{ step: 0.08 }}
        doubleClick={{ disabled: true }}
      >
        <StalkerZoomControls onFit={() => fitToView(FIT_ANIMATION_MS)} />
        <TransformComponent
          wrapperClass="h-full w-full"
          contentClass="h-full w-full"
        >
          <div
            className="relative h-full w-full"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          >
            <Application
              key={`stalker-${hmrVersion}`}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              backgroundColor={0xeef2f6}
              autoDensity
              resolution={
                typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
              }
              onInit={(app) => {
                appRef.current = app;
                app.stage.sortableChildren = true;
              }}
            >
              {!loaded && (
                <pixiText
                  text={t("stalker.loadingAssets")}
                  x={CANVAS_WIDTH / 2 - 100}
                  y={CANVAS_HEIGHT / 2}
                  style={{ fill: 0x64748b, fontSize: 16 }}
                />
              )}
              {loaded && (
                <>
                  <pixiGraphics draw={drawBackdrop} zIndex={Z_SHELL - 1} />
                  <pixiGraphics draw={drawShell} zIndex={Z_SHELL} />
                  <pixiGraphics draw={drawActiveZone} zIndex={Z_ZONE_GLOW} />
                  <EmployeeFrame />
                  <NewsTicker />
                  <WhiteboardHotspot onOpen={openWhiteboard} />
                  <CoffeeCups />
                  {OFFICE_FURNITURE.map((item) => {
                    const texture = textures.get(item.path);
                    if (!texture) {
                      return null;
                    }
                    const pulse = item.zone === "server" && serverRackPulse;
                    return (
                      <pixiSprite
                        key={item.id}
                        texture={texture}
                        x={item.x}
                        y={pulse ? item.y - 2 : item.y}
                        anchor={{ x: 0.5, y: 1 }}
                        zIndex={item.z}
                        scale={item.scale}
                        tint={pulse ? 0xccfbf1 : 0xffffff}
                      />
                    );
                  })}
                  <StalkerChibi
                    x={userPos.x}
                    y={userPos.y}
                    zIndex={isoDepth(USER_SEAT.col, USER_SEAT.row)}
                    color={USER_COLOR}
                    name={t("stalker.you")}
                  />
                  <StalkerChibi
                    x={bossPos.x}
                    y={bossPos.y}
                    zIndex={isoDepth(bossGrid.col, bossGrid.row) + 1}
                    color={CLAUDE_COLOR}
                    name={t("stalker.claude")}
                    tone="boss"
                  />
                  {placedAgents.map(({ agent, grid, x, y }) => (
                    <StalkerChibi
                      key={agent.id}
                      x={x}
                      y={y}
                      zIndex={isoDepth(grid.col, grid.row)}
                      color={agentColor(agent.number)}
                      name={shortName(agent)}
                    />
                  ))}
                  {OFFICE_ROOMS.map((room) => {
                    if (!room.label) {
                      return null;
                    }
                    const p = roomLabelPoint(room.region);
                    return (
                      <StalkerPill
                        key={`label-${room.id}`}
                        text={`${room.label.icon} ${t(room.label.key)}`}
                        x={p.x}
                        y={p.y}
                        zIndex={Z_LABEL}
                        tone={room.id === walkZone ? "active" : "default"}
                      />
                    );
                  })}
                </>
              )}
            </Application>
            <StalkerSpeechOverlays
              bossBubble={boss.bubble.content}
              bossX={bossPos.x}
              bossY={bossPos.y - CHIBI_BUBBLE_OFFSET}
              agents={overlayAgents}
            />
          </div>
        </TransformComponent>
      </TransformWrapper>
      </div>
    </div>
  );
}
