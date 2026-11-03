import { describe, expect, it } from 'vitest';
import { STATUS_TONE_COLOR, STATUS_TONES, STICKER_COLORS } from './status.js';

describe('status colours', () => {
  it('matches the DESIGN.md sticker palette', () => {
    expect(STICKER_COLORS).toEqual({
      blue: '#4da2ff',
      mint: '#55db9c',
      lavender: '#e9ccff',
      ember: '#fb4903',
      sun: '#ffd731',
      violet: '#5c4ade',
    });
  });

  it('maps every status tone to a colour', () => {
    expect(STATUS_TONES).toEqual(['requested', 'active', 'deposit', 'dispute', 'completed', 'cancelled']);
    expect(STATUS_TONE_COLOR).toEqual({
      requested: '#ffd731',
      active: '#4da2ff',
      deposit: '#e9ccff',
      dispute: '#fb4903',
      completed: '#5c4ade',
      cancelled: '#e9e9e9',
    });
  });
});
