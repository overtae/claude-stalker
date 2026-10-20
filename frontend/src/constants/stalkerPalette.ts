/** Warm pastel palette for the procedurally drawn office. */
export const PALETTE = {
  wood: 0xe6bd8f,
  woodDark: 0xbd8c60,
  white: 0xfbf6ee,
  gray: 0xdde2ea,
  sage: 0xa9cf9c,
  sageDark: 0x8fbb84,
  brown: 0xc99a70,
  rack: 0x4a5568,
  terracotta: 0xe6a07a,
  potWhite: 0xf6f3ee,
  leaf: 0x7cbf76,
  leafDark: 0x5fa35c,
  screen: 0xa9dcf5,
  screenDark: 0x2a3644,
  metal: 0xb3bdc8,
  // pastel accents
  peach: 0xf7b89c,
  butter: 0xf7da8e,
  mint: 0xa3dcc8,
  lilac: 0xcbb8e8,
  pink: 0xf5b8c8,
  sky: 0xa9cdf2,
} as const;

/** Chair colours rotate through these so desks don't look cloned. */
export const CHAIR_COLORS = [
  PALETTE.mint,
  PALETTE.peach,
  PALETTE.lilac,
  PALETTE.butter,
] as const;

/** Multiply each RGB channel (factor > 1 lightens, < 1 darkens). */
export function shade(color: number, factor: number): number {
  const ch = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((color >> shift) & 0xff) * factor)));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
