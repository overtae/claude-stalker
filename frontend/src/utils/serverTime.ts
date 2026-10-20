/**
 * Backend timestamps are UTC, but ones restored from SQLite come back without
 * an offset (`2026-10-20T06:27:27.149`). `new Date()` would read those as
 * local time, so pin offset-less ISO strings to UTC.
 */
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;

export function parseServerTime(value: string | null | undefined): Date {
  if (!value) {
    return new Date();
  }
  return new Date(HAS_OFFSET.test(value) ? value : `${value}Z`);
}
