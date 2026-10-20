"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useNavigationStore } from "@/stores/navigationStore";
import { useTranslation } from "@/hooks/useTranslation";
import { apiFetch } from "@/utils/api";
import type { FloorConfig, RoomConfig } from "@/types/navigation";

// ============================================================================
// ICON PICKER
// ============================================================================

const FLOOR_ICONS = [
  "\u{1F3E2}", // 🏢 office
  "\u{1F527}", // 🔧 wrench
  "\u{2696}\u{FE0F}", // ⚖️ scales
  "\u{1F4DA}", // 📚 books
  "\u{1F415}", // 🐕 dog
  "\u{1F6E0}\u{FE0F}", // 🛠️ tools
  "\u{1F310}", // 🌐 globe
  "\u{1F4BB}", // 💻 laptop
  "\u{1F680}", // 🚀 rocket
  "\u{1F3AF}", // 🎯 target
  "\u{1F52C}", // 🔬 microscope
  "\u{1F4CA}", // 📈 chart
  "\u{1F916}", // 🤖 robot
  "\u{26A1}", // ⚡ lightning
  "\u{1F331}", // 🌱 seedling
  "\u{1F517}", // 🔗 link
  "\u{1F4E6}", // 📦 package
  "\u{1F3D7}\u{FE0F}", // 🏗️ construction
  "\u{1F5A5}\u{FE0F}", // 🖥️ desktop
  "\u{1F9D1}\u{200D}\u{1F4BB}", // 🧑‍💻 coder
];

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-claude-400"
      >
        <span className="text-base leading-none">{value || "\u{1F3E2}"}</span>
        <span className="text-[10px] text-slate-400">{"\u25BC"}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 grid w-40 grid-cols-5 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {FLOOR_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => {
                onChange(icon);
                setOpen(false);
              }}
              className={`rounded-lg p-1.5 text-base leading-none transition-colors hover:bg-claude-50 ${
                value === icon ? "bg-claude-100 ring-1 ring-claude-400" : ""
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TYPES
// ============================================================================

interface FloorFormData {
  id: string;
  name: string;
  floorNumber: number;
  accent: string;
  icon: string;
  repos: string; // comma-separated, for editing
}

// ============================================================================
// HELPERS
// ============================================================================

function generateId(): string {
  return `floor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function floorConfigToFormData(floor: FloorConfig): FloorFormData {
  return {
    id: floor.id,
    name: floor.name,
    floorNumber: floor.floorNumber,
    accent: floor.accent,
    icon: floor.icon,
    repos: floor.rooms.map((r) => r.repoName).join(", "),
  };
}

function formDataToFloorConfig(data: FloorFormData): {
  id: string;
  name: string;
  floorNumber: number;
  accent: string;
  icon: string;
  rooms: RoomConfig[];
} {
  const repos = data.repos
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  return {
    id: data.id,
    name: data.name || `Floor ${data.floorNumber}`,
    floorNumber: data.floorNumber,
    accent: data.accent || "#6366f1",
    icon: data.icon || "\u{1F3E2}",
    rooms: repos.map((repoName, idx) => ({
      id: `${data.id}_room_${idx}`,
      repoName,
    })),
  };
}

// ============================================================================
// BUILDING TAB COMPONENT
// ============================================================================

/** New floors default to the Claude accent. */
const DEFAULT_FLOOR_ACCENT = "#d97757";

export function BuildingTab({
  onDirtyChange,
  detectedProjects = [],
}: {
  onDirtyChange?: (dirty: boolean) => void;
  /** Project folder names seen in sessions, offered as one-tap floors. */
  detectedProjects?: string[];
}): ReactNode {
  const buildingConfig = useNavigationStore((s) => s.buildingConfig);
  const updateBuildingConfig = useNavigationStore(
    (s) => s.updateBuildingConfig,
  );
  const { t } = useTranslation();

  const [buildingName, setBuildingName] = useState("");
  const [floors, setFloors] = useState<FloorFormData[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<{
    buildingName: string;
    floors: FloorFormData[];
  } | null>(null);

  // Initialize form from store config — runs on mount and whenever the store
  // config changes, via the adjust-state-during-render pattern (sentinel starts
  // undefined so the initial mount also syncs) instead of a cascading
  // setState-in-effect (react-hooks/set-state-in-effect).
  const [syncedConfig, setSyncedConfig] = useState<
    typeof buildingConfig | undefined
  >(undefined);
  if (syncedConfig !== buildingConfig) {
    setSyncedConfig(buildingConfig);
    if (buildingConfig) {
      const name = buildingConfig.buildingName;
      const fl = buildingConfig.floors.map(floorConfigToFormData);
      setBuildingName(name);
      setFloors(fl);
      setInitialData({ buildingName: name, floors: fl });
    }
  }

  // Detect dirty state
  useEffect(() => {
    if (!initialData) {
      onDirtyChange?.(false);
      return;
    }
    const dirty =
      buildingName !== initialData.buildingName ||
      floors.length !== initialData.floors.length ||
      floors.some(
        (f, i) =>
          f.name !== initialData.floors[i]?.name ||
          f.repos !== initialData.floors[i]?.repos ||
          f.accent !== initialData.floors[i]?.accent ||
          f.icon !== initialData.floors[i]?.icon,
      );
    onDirtyChange?.(dirty);
  }, [buildingName, floors, initialData, onDirtyChange]);

  const handleAddFloor = (project?: string) => {
    const nextFloorNumber =
      floors.length > 0 ? Math.max(...floors.map((f) => f.floorNumber)) + 1 : 1;
    setFloors((prev) => [
      ...prev,
      {
        id: generateId(),
        name: project ?? "",
        floorNumber: nextFloorNumber,
        accent: DEFAULT_FLOOR_ACCENT,
        icon: "\u{1F3E2}",
        repos: project ?? "",
      },
    ]);
  };

  // projects that no floor claims yet
  const claimedRepos = new Set(
    floors.flatMap((f) =>
      f.repos
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
    ),
  );
  const unclaimedProjects = detectedProjects.filter(
    (p) => !claimedRepos.has(p),
  );

  const handleRemoveFloor = (floorId: string) => {
    setFloors((prev) => prev.filter((f) => f.id !== floorId));
  };

  const handleUpdateFloor = (
    floorId: string,
    updates: Partial<FloorFormData>,
  ) => {
    setFloors((prev) =>
      prev.map((f) => (f.id === floorId ? { ...f, ...updates } : f)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    const config = {
      building_name: buildingName || "Building",
      floors: floors.map(formDataToFloorConfig),
    };

    try {
      const res = await apiFetch("/api/v1/preferences/building_config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: JSON.stringify(config) }),
      });

      if (res.ok) {
        updateBuildingConfig({
          buildingName: config.building_name,
          floors: config.floors,
        });
        setInitialData({ buildingName: config.building_name, floors });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setSaveError(
          t("settings.building.saveFailed", {
            status: res.status,
            statusText: res.statusText,
          }),
        );
      }
    } catch {
      setSaveError(t("settings.building.saveUnreachable"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hint */}
      <p className="text-xs text-slate-500">
        {t("settings.building.enableHint")}
      </p>

      {/* Building Name */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-500">
          {t("settings.building.name")}
        </label>
        <input
          type="text"
          value={buildingName}
          onChange={(e) => setBuildingName(e.target.value)}
          placeholder={t("settings.building.namePlaceholder")}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-claude-400 focus:ring-2 focus:ring-claude-100"
        />
      </div>

      {/* Floors List */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-500">
          {t("settings.building.floors")}
        </label>

        {floors.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-sm text-slate-400">
            {t("settings.building.noFloors")}
          </p>
        ) : (
          <div className="space-y-3">
            {floors.map((floor) => (
              <div
                key={floor.id}
                className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
              >
                {/* Floor header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    {t("settings.building.floorNumber")} {floor.floorNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFloor(floor.id)}
                    className="text-xs text-rose-500 transition-colors hover:text-rose-600"
                  >
                    {t("settings.building.deleteFloor")}
                  </button>
                </div>

                {/* Floor fields */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Name */}
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-500">
                      {t("settings.building.floorName")}
                    </label>
                    <input
                      type="text"
                      value={floor.name}
                      onChange={(e) =>
                        handleUpdateFloor(floor.id, { name: e.target.value })
                      }
                      placeholder="Engineering"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono text-slate-700 outline-none transition-colors focus:border-claude-400 focus:ring-2 focus:ring-claude-100"
                    />
                  </div>

                  {/* Icon */}
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-500">
                      {t("settings.building.icon")}
                    </label>
                    <IconPicker
                      value={floor.icon}
                      onChange={(icon) => handleUpdateFloor(floor.id, { icon })}
                    />
                  </div>

                  {/* Accent color */}
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-500">
                      {t("settings.building.accentColor")}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={floor.accent}
                        onChange={(e) =>
                          handleUpdateFloor(floor.id, {
                            accent: e.target.value,
                          })
                        }
                        className="h-8 w-8 cursor-pointer rounded-lg border border-slate-200 bg-transparent"
                      />
                      <span className="text-xs font-mono text-slate-400">
                        {floor.accent}
                      </span>
                    </div>
                  </div>

                  {/* Repos */}
                  <div className="col-span-2">
                    <label className="mb-1 block text-[11px] font-medium text-slate-500">
                      {t("settings.building.repos")}
                    </label>
                    <input
                      type="text"
                      value={floor.repos}
                      onChange={(e) =>
                        handleUpdateFloor(floor.id, { repos: e.target.value })
                      }
                      placeholder={t("settings.building.reposPlaceholder")}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono text-slate-700 outline-none transition-colors focus:border-claude-400 focus:ring-2 focus:ring-claude-100"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Floor button */}
        <button
          type="button"
          onClick={() => handleAddFloor()}
          className="mt-3 w-full rounded-xl border border-dashed border-slate-300 py-2 text-sm text-slate-500 transition-colors hover:border-claude-300 hover:bg-claude-50 hover:text-claude-700"
        >
          + {t("settings.building.addFloor")}
        </button>
      </div>

      {unclaimedProjects.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            {t("settings.building.detected")}
          </label>
          <p className="mb-2 text-[11px] text-slate-400">
            {t("settings.building.detectedHint")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unclaimedProjects.map((project) => (
              <button
                key={project}
                type="button"
                onClick={() => handleAddFloor(project)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-xs text-slate-600 transition-colors hover:border-claude-300 hover:bg-claude-50 hover:text-claude-700"
              >
                + {project}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="space-y-2 border-t border-slate-100 pt-4">
        {saveError && (
          <p className="text-center text-xs text-rose-500">{saveError}</p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`w-full rounded-xl py-2.5 text-sm font-bold transition-colors ${
            saved
              ? "bg-emerald-50 text-emerald-700"
              : saving
                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                : "bg-claude-500 text-white hover:bg-claude-600"
          }`}
        >
          {saved
            ? t("settings.building.saved")
            : saving
              ? t("settings.building.saving")
              : t("settings.building.save")}
        </button>
      </div>
    </div>
  );
}
