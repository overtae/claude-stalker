"use client";

import type { ReactNode } from "react";
import { GitBranch } from "lucide-react";
import { useGameStore, selectGitStatus } from "@/stores/gameStore";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/i18n";
import type { FileStatus } from "@/types";

const STATUS_KEY: Record<FileStatus, TranslationKey> = {
  M: "git.modified",
  A: "git.added",
  D: "git.deleted",
  R: "git.renamed",
  C: "git.copied",
  "?": "git.untracked",
  "!": "git.ignored",
};

const STATUS_STYLE: Partial<Record<FileStatus, string>> = {
  A: "text-teal-600",
  "?": "text-teal-600",
  D: "text-rose-500",
};

/** Git tab body: branch, changed files and recent commits. */
export function StalkerGitList(): ReactNode {
  const { t } = useTranslation();
  const git = useGameStore(selectGitStatus);

  if (!git) {
    return <p className="px-1 py-6 text-center text-xs text-slate-400">{t("stalker.gitEmpty")}</p>;
  }

  const files = git.changed_files ?? [];
  const commits = git.commits ?? [];

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-1">
      <p className="flex items-center gap-1.5 px-1 text-xs font-semibold text-slate-700">
        <GitBranch size={13} className="text-slate-400" aria-hidden />
        <span className="truncate font-mono">{git.branch}</span>
        {((git.ahead ?? 0) > 0 || (git.behind ?? 0) > 0) && (
          <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-400">
            {t("stalker.gitAheadBehind", { ahead: git.ahead ?? 0, behind: git.behind ?? 0 })}
          </span>
        )}
      </p>

      <section>
        <h3 className="px-1 pb-1 text-[10px] font-medium text-slate-400">
          {t("git.changedFiles")} · {files.length}
        </h3>
        {files.length === 0 ? (
          <p className="px-1 text-[11px] text-slate-400">{t("stalker.gitClean")}</p>
        ) : (
          <ul className="space-y-0.5">
            {files.map((file) => (
              <li key={file.path} className="flex items-center gap-2 rounded-md px-1 py-0.5 text-[11px] hover:bg-slate-50">
                <span
                  className={`w-3 shrink-0 text-center font-mono font-bold ${STATUS_STYLE[file.status] ?? "text-slate-400"}`}
                  title={t(STATUS_KEY[file.status])}
                >
                  {file.status}
                </span>
                <span className="truncate font-mono text-slate-600" title={file.path}>
                  {file.path}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="px-1 pb-1 text-[10px] font-medium text-slate-400">{t("git.recentCommits")}</h3>
        {commits.length === 0 ? (
          <p className="px-1 text-[11px] text-slate-400">{t("git.noCommits")}</p>
        ) : (
          <ul className="space-y-1">
            {commits.map((commit) => (
              <li key={commit.hash} className="px-1 text-[11px]">
                <p className="truncate text-slate-700">{commit.message}</p>
                <p className="text-[10px] text-slate-400">
                  <span className="font-mono">{commit.hash}</span> · {commit.author} · {commit.relative_time}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
