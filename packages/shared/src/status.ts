/** The six sticker colours of DESIGN.md, shared by both themes. */
export const STICKER_COLORS = {
  blue: '#4da2ff',
  mint: '#55db9c',
  lavender: '#e9ccff',
  ember: '#fb4903',
  sun: '#ffd731',
  violet: '#5c4ade',
} as const;

export type StickerColor = keyof typeof STICKER_COLORS;

/** Visual tones for status badges (DESIGN.md "Project adaptations" §4). */
export const STATUS_TONES = ['requested', 'active', 'deposit', 'dispute', 'completed', 'cancelled'] as const;

export type StatusTone = (typeof STATUS_TONES)[number];

/** Soft Mist — the neutral used for cancelled items. */
const SOFT_MIST = '#e9e9e9';

/** Mint stays decorative and is never a status colour. */
export const STATUS_TONE_COLOR: Record<StatusTone, string> = {
  requested: STICKER_COLORS.sun,
  active: STICKER_COLORS.blue,
  deposit: STICKER_COLORS.lavender,
  dispute: STICKER_COLORS.ember,
  completed: STICKER_COLORS.violet,
  cancelled: SOFT_MIST,
};
