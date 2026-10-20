"use client";

import { useEffect, type ReactNode } from "react";
import { usePreferencesStore } from "@/stores/preferencesStore";

/** Keeps document lang in sync with UI language preference. */
export function StalkerLangSync(): ReactNode {
  const language = usePreferencesStore((s) => s.language);

  useEffect(() => {
    document.documentElement.lang = language === "ko" ? "ko" : "en";
  }, [language]);

  return null;
}
