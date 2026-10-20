"use client";

import { usePreferencesStore, selectUiTheme } from "@/stores/preferencesStore";
import {
  stalkerThemes,
  type StalkerThemeTokens,
} from "@/constants/stalkerTheme";

export function useStalkerTheme(): StalkerThemeTokens {
  const uiTheme = usePreferencesStore(selectUiTheme);
  return stalkerThemes[uiTheme];
}
