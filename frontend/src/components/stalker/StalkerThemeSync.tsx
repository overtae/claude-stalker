"use client";

import { useEffect, type ReactNode } from "react";
import { usePreferencesStore, selectUiTheme } from "@/stores/preferencesStore";

/** Applies ui_theme to documentElement for Tailwind `dark:` variants. */
export function StalkerThemeSync(): ReactNode {
  const uiTheme = usePreferencesStore(selectUiTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", uiTheme === "dark");
  }, [uiTheme]);

  return null;
}
