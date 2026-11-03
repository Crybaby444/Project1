import { describe, expect, it } from 'vitest';
import { STATUS_TONES, STATUS_TONE_COLOR, STICKER_COLORS } from './status';

describe('sticker palette', () => {
  it('matches the six DESIGN.md sticker colours', () => {
    expect(STICKER_COLORS).toEqual({
      blue: '#4da2ff',
      mint: '#55db9c',
      lavender: '#e9ccff',
      ember: '#fb4903',
      sun: '#ffd731',
      violet: '#5c4ade',
    });
  });
});

describe('status tones', () => {
  it('maps every tone to the colour DESIGN.md §4 assigns', () => {
    expect(STATUS_TONE_COLOR).toEqual({
      requested: '#ffd731',
      active: '#4da2ff',
      deposit: '#e9ccff',
      dispute: '#fb4903',
      completed: '#5c4ade',
      cancelled: '#e9e9e9',
    });
  });

  it('never uses mint (a decorative colour) as a status', () => {
    expect(Object.values(STATUS_TONE_COLOR)).not.toContain('#55db9c');
    expect(STATUS_TONES).toHaveLength(6);
  });
});
