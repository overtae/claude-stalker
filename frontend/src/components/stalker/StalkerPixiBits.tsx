"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { CanvasTextMetrics, TextStyle, type Graphics } from "pixi.js";

const OUTLINE = 0x2f2a28;

export type PillTone = "default" | "active" | "boss";

const PILL_TONES: Record<PillTone, { bg: number; border: number; text: number }> = {
  default: { bg: 0xffffff, border: 0xe2e8f0, text: 0x475569 },
  active: { bg: 0x0d9488, border: 0x0f766e, text: 0xffffff },
  boss: { bg: 0xfff7ed, border: 0xfdba74, text: 0x9a3412 },
};

interface StalkerPillProps {
  text: string;
  x: number;
  y: number;
  zIndex: number;
  tone?: PillTone;
  /** "left" anchors the pill's left edge at x, "center" centres it. */
  align?: "left" | "center";
  fontSize?: number;
}

export function StalkerPill({
  text,
  x,
  y,
  zIndex,
  tone = "default",
  align = "center",
  fontSize = 12,
}: StalkerPillProps): ReactNode {
  const colors = PILL_TONES[tone];
  const style = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, system-ui, sans-serif",
        fontSize,
        fontWeight: "700",
        fill: colors.text,
      }),
    [fontSize, colors.text],
  );
  const metrics = useMemo(
    () => CanvasTextMetrics.measureText(text, style),
    [text, style],
  );
  const padX = 8;
  const w = metrics.width + padX * 2;
  const h = fontSize + 9;
  const left = align === "left" ? 0 : -w / 2;

  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      g.roundRect(left, -h / 2 + 2, w, h, h / 2);
      g.fill({ color: 0x0f172a, alpha: 0.1 });
      g.roundRect(left, -h / 2, w, h, h / 2);
      g.fill({ color: colors.bg, alpha: 0.96 });
      g.stroke({ color: colors.border, width: 1.5 });
    },
    [left, w, h, colors.bg, colors.border],
  );

  return (
    <pixiContainer x={x} y={y} zIndex={zIndex}>
      <pixiGraphics draw={draw} />
      <pixiText
        text={text}
        style={style}
        x={left + padX}
        y={-metrics.height / 2}
        resolution={2}
      />
    </pixiContainer>
  );
}

/** Pixel size of one Clawd block. */
const PX = 4;

function shade(color: number, factor: number): number {
  const ch = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((color >> shift) & 0xff) * factor)));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

type Block = [x: number, y: number, w: number, h: number];

// Clawd, the Claude Code mascot, in block units with feet at y = 0.
const BODY: Block = [-5, -8, 10, 6];
const ARMS: Block[] = [
  [-6, -6, 1, 2],
  [5, -6, 1, 2],
];
const LEGS: Block[] = [
  [-4, -2, 1, 2],
  [-2, -2, 1, 2],
  [1, -2, 1, 2],
  [3, -2, 1, 2],
];
const EYES: Block[] = [
  [-3, -7, 1, 2],
  [2, -7, 1, 2],
];

function rect(g: Graphics, [x, y, w, h]: Block, grow = 0): Graphics {
  return g.rect(x * PX - grow, y * PX - grow, w * PX + grow * 2, h * PX + grow * 2);
}

function drawClawd(g: Graphics, color: number): void {
  g.clear();
  g.ellipse(0, 1, 26, 6);
  g.fill({ color: 0x0f172a, alpha: 0.16 });

  // outline pass, then fills on top so joints merge cleanly
  for (const block of [BODY, ...ARMS, ...LEGS]) {
    rect(g, block, 2);
  }
  g.fill({ color: OUTLINE });

  rect(g, BODY);
  for (const block of ARMS) {
    rect(g, block);
  }
  g.fill({ color });
  for (const block of LEGS) {
    rect(g, block);
  }
  g.fill({ color: shade(color, 0.82) });
  // soft top highlight + bottom shade for a bit of volume
  rect(g, [BODY[0], BODY[1], BODY[2], 1]);
  g.fill({ color: shade(color, 1.12) });
  rect(g, [BODY[0], -3, BODY[2], 1]);
  g.fill({ color: shade(color, 0.88) });
  for (const block of EYES) {
    rect(g, block);
  }
  g.fill({ color: 0x1c1917 });
}

/** Feet-to-bubble distance — speech bubbles sit above the name pill. */
export const CHIBI_BUBBLE_OFFSET = 56;

interface StalkerChibiProps {
  x: number;
  y: number;
  zIndex: number;
  color: number;
  name?: string;
  tone?: PillTone;
}

export function StalkerChibi({
  x,
  y,
  zIndex,
  color,
  name,
  tone = "default",
}: StalkerChibiProps): ReactNode {
  const draw = useCallback((g: Graphics) => drawClawd(g, color), [color]);

  return (
    <pixiContainer x={x} y={y} zIndex={zIndex} sortableChildren={true}>
      <pixiGraphics draw={draw} />
      {name && (
        <StalkerPill
          text={name}
          x={0}
          y={-44}
          zIndex={1}
          fontSize={10}
          tone={tone}
        />
      )}
    </pixiContainer>
  );
}
