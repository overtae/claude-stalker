/**
 * EventDetailModal - Modal showing full details of a clicked event log entry
 */

"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import type { EventLogEntry } from "@/stores/gameStore";
import { useTranslation } from "@/hooks/useTranslation";
import { useMainAgent } from "@/hooks/useMainAgent";
import { usePreferencesStore } from "@/stores/preferencesStore";
import type { TranslationKey } from "@/i18n";
import Modal from "@/components/overlay/Modal";

interface EventDetailModalProps {
  event: EventLogEntry;
  onClose: () => void;
}

/** Events from the main Claude session carry this agent id. */
const MAIN_AGENT_ID = "main";

const TIME_FORMAT = {
  ko: "yyyy. M. d. a h:mm:ss",
  en: "MMM d, HH:mm:ss",
} as const;

/** Text fields shown as labelled blocks, in display order. */
const TEXT_FIELDS: {
  key:
    | "toolName"
    | "agentName"
    | "taskDescription"
    | "prompt"
    | "thinking"
    | "message"
    | "resultSummary"
    | "errorType";
  label: TranslationKey;
  tone?: string;
  mono?: boolean;
}[] = [
  { key: "toolName", label: "eventDetail.tool", mono: true },
  { key: "agentName", label: "eventDetail.agentName" },
  { key: "taskDescription", label: "eventDetail.taskDescription" },
  {
    key: "prompt",
    label: "eventDetail.userPrompt",
    tone: "bg-claude-50 border-claude-100 text-slate-800 dark:bg-claude-950/35 dark:border-claude-800/40 dark:text-neutral-200",
  },
  {
    key: "thinking",
    label: "eventDetail.thinking",
    tone: "bg-slate-50 border-slate-100 italic text-slate-500 dark:bg-neutral-800/50 dark:border-neutral-700 dark:text-neutral-400",
  },
  { key: "message", label: "eventDetail.message" },
  { key: "resultSummary", label: "eventDetail.resultSummary" },
  {
    key: "errorType",
    label: "eventDetail.errorType",
    tone: "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300",
  },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactNode {
  return (
    <section>
      <h3 className="mb-1 text-[11px] font-semibold text-slate-400 dark:text-neutral-500">
        {label}
      </h3>
      {children}
    </section>
  );
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const { t } = useTranslation();
  const mainAgent = useMainAgent();
  const language = usePreferencesStore((s) => s.language);
  const detail = event.detail ?? {};
  const fields = TEXT_FIELDS.filter(({ key }) => detail[key]);
  const hasDetail = fields.length > 0 || !!detail.toolInput;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="lg"
      title={t(`eventType.${event.type}` as TranslationKey)}
      titleAdornment={
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-neutral-800 dark:text-neutral-400">
          {event.type}
        </span>
      }
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-claude-500 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-claude-600"
        >
          {t("modal.close")}
        </button>
      }
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-2xl bg-slate-50 px-4 py-3 text-xs dark:bg-neutral-800/60">
          <dt className="text-slate-400 dark:text-neutral-500">
            {t("eventDetail.time")}
          </dt>
          <dd className="tabular-nums text-slate-700 dark:text-neutral-200">
            {format(event.timestamp, TIME_FORMAT[language])}
          </dd>
          {event.agentId && (
            <>
              <dt className="text-slate-400 dark:text-neutral-500">
                {t("eventDetail.actor")}
              </dt>
              <dd className="truncate text-slate-700 dark:text-neutral-200">
                {event.agentId === MAIN_AGENT_ID ? (
                  mainAgent.name
                ) : (
                  <span className="font-mono">{event.agentId}</span>
                )}
              </dd>
            </>
          )}
        </dl>

        <Field label={t("eventDetail.summary")}>
          <p className="text-sm text-slate-800 dark:text-neutral-100">
            {event.summary}
          </p>
        </Field>

        {fields.map(({ key, label, tone, mono }) => (
          <Field key={key} label={t(label)}>
            <p
              className={`whitespace-pre-wrap break-words text-[13px] leading-relaxed ${
                tone
                  ? `rounded-xl border px-3 py-2 ${tone}`
                  : "text-slate-700 dark:text-neutral-300"
              } ${mono ? "font-mono" : ""}`}
            >
              {String(detail[key])}
            </p>
          </Field>
        ))}

        {detail.toolInput && (
          <Field label={t("eventDetail.toolInput")}>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-slate-100 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-600 dark:border-neutral-700 dark:bg-neutral-950/50 dark:text-neutral-300">
              {JSON.stringify(detail.toolInput, null, 2)}
            </pre>
          </Field>
        )}

        {!hasDetail && (
          <p className="py-2 text-center text-xs text-slate-400 dark:text-neutral-500">
            {t("eventDetail.noDetail")}
          </p>
        )}
      </div>
    </Modal>
  );
}
