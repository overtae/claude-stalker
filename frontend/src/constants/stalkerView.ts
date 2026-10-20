/** Stalker 전용 UI (기본). 레거시 claude-office UI 보려면 NEXT_PUBLIC_STALKER_LEGACY_OFFICE=true */
export const STALKER_HIDE_LEGACY_OFFICE =
  process.env.NEXT_PUBLIC_STALKER_LEGACY_OFFICE !== "true";

/** 사이드바·다크 대시보드 숨김. 복구: NEXT_PUBLIC_STALKER_LEGACY_SHELL=true */
export const STALKER_MINIMAL_SHELL =
  process.env.NEXT_PUBLIC_STALKER_LEGACY_SHELL !== "true";

/** @deprecated 레거시 오피스 반투명 모드 */
export const STALKER_ISO_STAGE_ENABLED = STALKER_HIDE_LEGACY_OFFICE;

export const STALKER_PIXEL_OFFICE_ALPHA = 0.42;
