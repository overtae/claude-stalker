"use client";

import { X } from "lucide-react";
import { ReactNode, useEffect, useId } from "react";
import { useTranslation } from "@/hooks/useTranslation";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
  /** Optional element shown before the title (badge, icon). */
  titleAdornment?: ReactNode;
  size?: "md" | "lg";
}

const SIZE_CLASS = { md: "max-w-md", lg: "max-w-2xl" } as const;

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  dismissible = true,
  titleAdornment,
  size = "md",
}: ModalProps) {
  const { t } = useTranslation();
  const titleId = useId();

  // Close on Escape key (only if dismissible)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    }
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose, dismissible]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={dismissible ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[80vh] w-full ${SIZE_CLASS[size]} flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white text-slate-700 shadow-2xl shadow-slate-900/10 animate-in zoom-in-95 duration-200 dark:border-neutral-700/80 dark:bg-neutral-900 dark:text-neutral-200 dark:shadow-black/40`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-slate-100 px-6 py-4 dark:border-neutral-800">
          {titleAdornment}
          <h2
            id={titleId}
            className="mr-auto text-base font-bold tracking-tight text-slate-900 dark:text-neutral-100"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("modal.close")}
            className="cursor-pointer rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-3 dark:border-neutral-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
