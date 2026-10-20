import { describe, expect, it } from "vitest";
import { getTranslation, isLocale, type TranslationKey } from "../src/i18n";
import en from "../src/i18n/en";
import ko from "../src/i18n/ko";

describe("isLocale", () => {
  it("accepts en and ko", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ko")).toBe(true);
  });

  it("rejects legacy and invalid locales", () => {
    expect(isLocale("pt-BR")).toBe(false);
    expect(isLocale("es")).toBe(false);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
  });

  it("rejects prototype chain properties", () => {
    expect(isLocale("toString")).toBe(false);
    expect(isLocale("__proto__")).toBe(false);
  });
});

describe("getTranslation", () => {
  const tEn = getTranslation("en");
  const tKo = getTranslation("ko");

  it("returns locale-specific stalker strings", () => {
    expect(tEn("zones.dev")).toBe("Dev room");
    expect(tKo("zones.dev")).toBe("개발실");
  });

  it("interpolates parameters", () => {
    expect(tEn("stalker.subtitle", { count: 2 })).toContain("2");
    expect(tKo("stalker.nowIn", { zone: "개발실" })).toContain("개발실");
  });

  it("ko has all keys", () => {
    const enKeys = Object.keys(en).sort();
    const koKeys = Object.keys(ko).sort();
    expect(koKeys).toEqual(enKeys);
  });

  it("all keys return non-empty via getTranslation", () => {
    for (const key of Object.keys(en) as TranslationKey[]) {
      expect(tKo(key).length).toBeGreaterThan(0);
      expect(tEn(key).length).toBeGreaterThan(0);
    }
  });

  it("ko does not fall back to English text", () => {
    // Brand names and literal tokens that are the same in both languages.
    const sameInBoth = new Set<TranslationKey>([
      "app.title",
      "stalker.brand",
      "stalker.live",
      "stalker.claude",
      "conversation.claude",
      "stalker.floorGuideTag",
      "settings.building.reposPlaceholder",
      "attention.toast.backgroundTask",
      "stalker.tab.git",
      "stalker.gitAheadBehind",
    ]);
    const untranslated = (Object.keys(en) as TranslationKey[]).filter(
      (key) => !sameInBoth.has(key) && ko[key] === en[key],
    );
    expect(untranslated).toEqual([]);
  });
});
