"use client";

import type { ReactNode } from "react";
import { useControls } from "react-zoom-pan-pinch";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface StalkerZoomControlsProps {
  onFit: () => void;
}

const BUTTON =
  "flex h-10 w-10 cursor-pointer items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-claude-500 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";

export function StalkerZoomControls({
  onFit,
}: StalkerZoomControlsProps): ReactNode {
  const { zoomIn, zoomOut } = useControls();
  const { t } = useTranslation();

  return (
    <div className="absolute bottom-4 left-4 z-20 flex flex-col divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-md backdrop-blur dark:divide-neutral-800 dark:border-neutral-700/80 dark:bg-neutral-900/95">
      <button
        type="button"
        onClick={() => zoomIn()}
        className={BUTTON}
        aria-label={t("zoom.in")}
      >
        <Plus size={16} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={() => zoomOut()}
        className={BUTTON}
        aria-label={t("zoom.out")}
      >
        <Minus size={16} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={onFit}
        className={BUTTON}
        aria-label={t("zoom.reset")}
      >
        <RotateCcw size={15} strokeWidth={2.25} />
      </button>
    </div>
  );
}
