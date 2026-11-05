import { describe, expect, it } from 'vitest';
import { displayFit, longestWord } from './display-fit';

describe('longestWord', () => {
  it('counts the letters of the longest word', () => {
    expect(longestWord('Почта подтверждена')).toBe(12);
    expect(longestWord('Sign in')).toBe(4);
  });

  it('lets a word break after its hyphen, as browsers do', () => {
    expect(longestWord('E-pasts')).toBe(5);
    expect(longestWord('yo-yo sticker-book')).toBe(8); // "sticker-": the hyphen stays on the line
  });

  it('counts letters with diacritics once, whether composed or not', () => {
    expect(longestWord('Reģistrēties')).toBe(12);
    expect(longestWord('Reģistrēties'.normalize('NFD'))).toBe(12);
  });

  it('is at least 1 for empty text', () => {
    expect(longestWord('')).toBe(1);
    expect(longestWord('   ')).toBe(1);
  });
});

describe('displayFit', () => {
  it('hands the longest word and the size range to the CSS utility', () => {
    expect(displayFit('Почта подтверждена', { max: '2.75rem' })).toEqual({
      '--fit-chars': 12,
      '--fit-max': '2.75rem',
    });
    expect(displayFit('404', { min: '3rem', max: '10rem' })).toEqual({
      '--fit-chars': 3,
      '--fit-min': '3rem',
      '--fit-max': '10rem',
    });
  });

  it('allows wider letters for a title drawn letter by letter (no kerning between boxes)', () => {
    expect(displayFit('YOYO', { max: '12.5rem', split: true })).toMatchObject({ '--fit-em': 1.1 });
    expect(displayFit('YOYO', { max: '12.5rem' })).not.toHaveProperty('--fit-em');
  });
});
