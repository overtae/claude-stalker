"use client";

import { STALKER_HIDE_LEGACY_OFFICE } from "@/constants/stalkerView";
import { useState, useCallback, ReactNode } from "react";
import Modal from "./Modal";
import {
  usePreferencesStore,
  type ClockType,
  type ClockFormat,
  type UiTheme,
} from "@/stores/preferencesStore";
import { useTranslation } from "@/hooks/useTranslation";
import { locales, type Locale } from "@/i18n";
import { BuildingTab } from "@/components/settings/BuildingTab";

// ============================================================================
// TYPES
// ============================================================================

type SettingsTab = "general" | "building";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "general" | "building";
  /** Project folder names seen in sessions (building tab quick-add). */
  detectedProjects?: string[];
}

// ============================================================================
// HELPER COMPONENT
// ============================================================================

function SettingsToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}): ReactNode {
  return (
    <div
      role="switch"
      aria-checked={checked}
      aria-label={label}
      tabIndex={0}
      onClick={onChange}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange();
        }
      }}
      className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700/80"
    >
      <span className="text-sm text-slate-700 dark:text-neutral-200">
        {label}
      </span>
      <div
        className={`w-9 h-5 rounded-full relative transition-colors ${
          checked ? "bg-claude-500" : "bg-slate-300"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SettingsModal({
  isOpen,
  onClose,
  initialTab = "general",
  detectedProjects,
}: SettingsModalProps): ReactNode {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [buildingDirty, setBuildingDirty] = useState(false);

  // Sync tab when initialTab changes (e.g. edit-building request).
  // Adjust-state-during-render pattern: reinitializes from the prop without a
  // cascading setState-in-effect (react-hooks/set-state-in-effect).
  const [syncedInitialTab, setSyncedInitialTab] = useState(initialTab);
  if (syncedInitialTab !== initialTab) {
    setSyncedInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  const clockType = usePreferencesStore((s) => s.clockType);
  const clockFormat = usePreferencesStore((s) => s.clockFormat);
  const autoFollowNewSessions = usePreferencesStore(
    (s) => s.autoFollowNewSessions,
  );
  const setClockType = usePreferencesStore((s) => s.setClockType);
  const setClockFormat = usePreferencesStore((s) => s.setClockFormat);
  const language = usePreferencesStore((s) => s.language);
  const setLanguage = usePreferencesStore((s) => s.setLanguage);
  const uiTheme = usePreferencesStore((s) => s.uiTheme);
  const setUiTheme = usePreferencesStore((s) => s.setUiTheme);
  const setAutoFollowNewSessions = usePreferencesStore(
    (s) => s.setAutoFollowNewSessions,
  );

  // Attention settings
  const commandBarEnabled = usePreferencesStore((s) => s.commandBarEnabled);
  const clickToFocusEnabled = usePreferencesStore((s) => s.clickToFocusEnabled);
  const toastFilterPermission = usePreferencesStore(
    (s) => s.toastFilterPermission,
  );
  const toastFilterError = usePreferencesStore((s) => s.toastFilterError);
  const toastFilterTaskComplete = usePreferencesStore(
    (s) => s.toastFilterTaskComplete,
  );
  const toastFilterArrival = usePreferencesStore((s) => s.toastFilterArrival);
  const setCommandBarEnabled = usePreferencesStore(
    (s) => s.setCommandBarEnabled,
  );
  const setClickToFocusEnabled = usePreferencesStore(
    (s) => s.setClickToFocusEnabled,
  );
  const setToastFilterPermission = usePreferencesStore(
    (s) => s.setToastFilterPermission,
  );
  const setToastFilterError = usePreferencesStore((s) => s.setToastFilterError);
  const setToastFilterTaskComplete = usePreferencesStore(
    (s) => s.setToastFilterTaskComplete,
  );
  const setToastFilterArrival = usePreferencesStore(
    (s) => s.setToastFilterArrival,
  );

  const { t } = useTranslation();

  const handleDirtyChange = useCallback((dirty: boolean) => {
    setBuildingDirty(dirty);
  }, []);

  const handleTabSwitch = (tab: SettingsTab) => {
    if (
      activeTab === "building" &&
      tab !== "building" &&
      buildingDirty &&
      !window.confirm(t("settings.building.unsavedWarning"))
    ) {
      return;
    }
    setActiveTab(tab);
  };

  const handleLanguageChange = (locale: Locale) => {
    setLanguage(locale);
  };

  const handleUiThemeChange = (theme: UiTheme) => {
    setUiTheme(theme);
  };

  const handleClockTypeChange = (type: ClockType) => {
    setClockType(type);
  };

  const handleClockFormatChange = (format: ClockFormat) => {
    setClockFormat(format);
  };

  const handleAutoFollowToggle = () => {
    setAutoFollowNewSessions(!autoFollowNewSessions);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      dismissible={false}
      title={t("settings.title")}
      footer={
        <button
          onClick={onClose}
          className="cursor-pointer rounded-xl bg-claude-500 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-claude-600"
        >
          {t("modal.close")}
        </button>
      }
    >
      {/* Tab bar */}
      <div className="mb-6 flex gap-0.5 rounded-xl bg-slate-100 p-0.5 dark:bg-neutral-800">
        {(["general", "building"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabSwitch(tab)}
            className={`flex-1 cursor-pointer rounded-[10px] px-4 py-1.5 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-white text-slate-800 shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
                : "text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {t(`settings.tabs.${tab}`)}
            {tab === "building" && buildingDirty && (
              <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "general" ? (
        <div className="space-y-6">
          {/* Language */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500 dark:text-neutral-400">
              {t("settings.language")}
            </label>
            <div
              className="flex gap-3"
              role="radiogroup"
              aria-label={t("settings.language")}
            >
              {(Object.entries(locales) as [Locale, string][]).map(
                ([locale, label]) => (
                  <button
                    key={locale}
                    type="button"
                    role="radio"
                    aria-checked={language === locale}
                    tabIndex={language === locale ? 0 : -1}
                    onClick={() => handleLanguageChange(locale)}
                    onKeyDown={(e) => {
                      const items = Object.keys(locales) as Locale[];
                      const idx = items.indexOf(locale);
                      let next: number | null = null;
                      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                        e.preventDefault();
                        next = (idx + 1) % items.length;
                      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                        e.preventDefault();
                        next = (idx - 1 + items.length) % items.length;
                      }
                      if (next !== null) {
                        handleLanguageChange(items[next]);
                        const parent = e.currentTarget.parentElement;
                        if (parent)
                          (parent.children[next] as HTMLElement)?.focus();
                      }
                    }}
                    className={`flex-1 cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-claude-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900 ${
                      language === locale
                        ? "border-claude-300 bg-claude-50 text-claude-700 dark:border-claude-600 dark:bg-neutral-800 dark:text-claude-300"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:border-neutral-500"
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Appearance */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500 dark:text-neutral-400">
              {t("settings.uiTheme")}
            </label>
            <div
              className="flex gap-3"
              role="radiogroup"
              aria-label={t("settings.uiTheme")}
            >
              {(["light", "dark"] as const).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  role="radio"
                  aria-checked={uiTheme === theme}
                  tabIndex={uiTheme === theme ? 0 : -1}
                  onClick={() => handleUiThemeChange(theme)}
                  onKeyDown={(e) => {
                    const values: UiTheme[] = ["light", "dark"];
                    const parent = e.currentTarget.parentElement;
                    if (!parent) return;
                    const buttons = Array.from(
                      parent.children,
                    ) as HTMLElement[];
                    const idx = buttons.indexOf(e.currentTarget);
                    let nextIdx: number | null = null;
                    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                      e.preventDefault();
                      nextIdx = (idx + 1) % values.length;
                    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      e.preventDefault();
                      nextIdx = (idx - 1 + values.length) % values.length;
                    }
                    if (nextIdx !== null) {
                      handleUiThemeChange(values[nextIdx]);
                      (parent.children[nextIdx] as HTMLElement)?.focus();
                    }
                  }}
                  className={`flex-1 cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-claude-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900 ${
                    uiTheme === theme
                      ? "border-claude-300 bg-claude-50 text-claude-700 dark:border-claude-600 dark:bg-neutral-800 dark:text-claude-300"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:border-neutral-500"
                  }`}
                >
                  {t(
                    theme === "light"
                      ? "settings.uiTheme.light"
                      : "settings.uiTheme.dark",
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Clock settings drive the legacy pixel office only */}
          {!STALKER_HIDE_LEGACY_OFFICE && (
            <>
              {/* Clock Type */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500">
                  {t("settings.clockType")}
                </label>
                <div
                  className="flex gap-3"
                  role="radiogroup"
                  aria-label={t("settings.clockType")}
                >
                  {(["analog", "digital"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={clockType === type}
                      tabIndex={clockType === type ? 0 : -1}
                      onClick={() => handleClockTypeChange(type)}
                      onKeyDown={(e) => {
                        const values: ClockType[] = ["analog", "digital"];
                        const parent = e.currentTarget.parentElement;
                        if (!parent) return;
                        const buttons = Array.from(
                          parent.children,
                        ) as HTMLElement[];
                        const idx = buttons.indexOf(e.currentTarget);
                        let nextIdx: number | null = null;
                        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                          e.preventDefault();
                          nextIdx = (idx + 1) % values.length;
                        } else if (
                          e.key === "ArrowLeft" ||
                          e.key === "ArrowUp"
                        ) {
                          e.preventDefault();
                          nextIdx = (idx - 1 + values.length) % values.length;
                        }
                        if (nextIdx !== null) {
                          handleClockTypeChange(values[nextIdx]);
                          buttons[nextIdx].focus();
                        }
                      }}
                      className={`flex-1 cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-claude-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900 ${
                        clockType === type
                          ? "border-claude-300 bg-claude-50 text-claude-700 dark:border-claude-600 dark:bg-neutral-800 dark:text-claude-300"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:border-neutral-500"
                      }`}
                    >
                      {type === "analog"
                        ? t("settings.analog")
                        : t("settings.digital")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Format - only visible when digital */}
              {clockType === "digital" && (
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-500">
                    {t("settings.timeFormat")}
                  </label>
                  <div
                    className="flex gap-3"
                    role="radiogroup"
                    aria-label={t("settings.timeFormat")}
                  >
                    {(["12h", "24h"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        role="radio"
                        aria-checked={clockFormat === fmt}
                        tabIndex={clockFormat === fmt ? 0 : -1}
                        onClick={() => handleClockFormatChange(fmt)}
                        onKeyDown={(e) => {
                          const values: ClockFormat[] = ["12h", "24h"];
                          const parent = e.currentTarget.parentElement;
                          if (!parent) return;
                          const buttons = Array.from(
                            parent.children,
                          ) as HTMLElement[];
                          const idx = buttons.indexOf(e.currentTarget);
                          let nextIdx: number | null = null;
                          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                            e.preventDefault();
                            nextIdx = (idx + 1) % values.length;
                          } else if (
                            e.key === "ArrowLeft" ||
                            e.key === "ArrowUp"
                          ) {
                            e.preventDefault();
                            nextIdx = (idx - 1 + values.length) % values.length;
                          }
                          if (nextIdx !== null) {
                            handleClockFormatChange(values[nextIdx]);
                            buttons[nextIdx].focus();
                          }
                        }}
                        className={`flex-1 cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-claude-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900 ${
                          clockFormat === fmt
                            ? "border-claude-300 bg-claude-50 text-claude-700 dark:border-claude-600 dark:bg-neutral-800 dark:text-claude-300"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:border-neutral-500"
                        }`}
                      >
                        {fmt === "12h"
                          ? t("settings.12hour")
                          : t("settings.24hour")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Session Settings */}
          <div className="border-t border-slate-100 pt-4 dark:border-neutral-800">
            <label className="mb-2 block text-xs font-semibold text-slate-500 dark:text-neutral-400">
              {t("settings.sessionBehavior")}
            </label>
            <div
              role="switch"
              aria-checked={autoFollowNewSessions}
              aria-label={t("settings.autoFollow")}
              tabIndex={0}
              onClick={handleAutoFollowToggle}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleAutoFollowToggle();
                }
              }}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-neutral-600 dark:bg-neutral-800/60 dark:hover:border-neutral-500 dark:hover:bg-neutral-800"
            >
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-neutral-200">
                  {t("settings.autoFollow")}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                  {t("settings.autoFollowDesc")}
                </p>
              </div>
              <div
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  autoFollowNewSessions
                    ? "bg-claude-500"
                    : "bg-slate-300 dark:bg-neutral-600"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                    autoFollowNewSessions ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Attention Settings */}
          <div className="border-t border-slate-100 pt-4 dark:border-neutral-800">
            <label className="mb-2 block text-xs font-semibold text-slate-500 dark:text-neutral-400">
              {t("settings.toastFilters")}
            </label>
            <div className="space-y-2">
              <SettingsToggle
                label={t("settings.commandBar")}
                checked={commandBarEnabled}
                onChange={() => setCommandBarEnabled(!commandBarEnabled)}
              />
              <SettingsToggle
                label={t("settings.clickToFocus")}
                checked={clickToFocusEnabled}
                onChange={() => setClickToFocusEnabled(!clickToFocusEnabled)}
              />
              <SettingsToggle
                label={t("settings.filterPermission")}
                checked={toastFilterPermission}
                onChange={() =>
                  setToastFilterPermission(!toastFilterPermission)
                }
              />
              <SettingsToggle
                label={t("settings.filterError")}
                checked={toastFilterError}
                onChange={() => setToastFilterError(!toastFilterError)}
              />
              <SettingsToggle
                label={t("settings.filterTaskComplete")}
                checked={toastFilterTaskComplete}
                onChange={() =>
                  setToastFilterTaskComplete(!toastFilterTaskComplete)
                }
              />
              <SettingsToggle
                label={t("settings.filterArrival")}
                checked={toastFilterArrival}
                onChange={() => setToastFilterArrival(!toastFilterArrival)}
              />
            </div>
          </div>

          {!STALKER_HIDE_LEGACY_OFFICE && (
            <div className="border-t border-slate-100 pt-4 dark:border-neutral-800">
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {t("settings.clockTip")}
              </p>
            </div>
          )}
        </div>
      ) : (
        <BuildingTab
          onDirtyChange={handleDirtyChange}
          detectedProjects={detectedProjects}
        />
      )}
    </Modal>
  );
}
