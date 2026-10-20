"use client";

import type { ReactNode } from "react";
import type { BubbleContent } from "@/types";
import { truncateBubbleText } from "@/utils/bubbleText";

export interface StalkerSpeechOverlaysProps {
  bossBubble: BubbleContent | null;
  bossX: number;
  bossY: number;
  agents: Array<{
    id: string;
    bubble: BubbleContent | null;
    x: number;
    y: number;
  }>;
}

function SpeechBubble({
  content,
  x,
  y,
}: {
  content: BubbleContent;
  x: number;
  y: number;
}): ReactNode {
  const text = truncateBubbleText(String(content.text ?? ""), 120);
  const isError =
    content.icon === "💦" ||
    (typeof content.text === "string" && content.text.includes("실패"));
  const tone = isError
    ? "border-rose-300 bg-rose-50 text-rose-900"
    : "border-slate-200 bg-white text-slate-800";

  return (
    <div
      className={`absolute max-w-[200px] rounded-xl border px-2.5 py-1.5 text-[11px] font-medium shadow-md ${tone}`}
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -100%)",
      }}
    >
      {content.icon && (
        <span className="mr-1" aria-hidden>
          {content.icon}
        </span>
      )}
      {text}
    </div>
  );
}

export function StalkerSpeechOverlays({
  bossBubble,
  bossX,
  bossY,
  agents,
}: StalkerSpeechOverlaysProps): ReactNode {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {bossBubble && (
        <SpeechBubble content={bossBubble} x={bossX} y={bossY} />
      )}
      {agents.map((agent) =>
        agent.bubble ? (
          <SpeechBubble
            key={agent.id}
            content={agent.bubble}
            x={agent.x}
            y={agent.y}
          />
        ) : null,
      )}
    </div>
  );
}
