import { describe, expect, it } from 'vitest';
import { cleanText } from './text';

describe('cleanText', () => {
  it('removes HTML tags, comments and script or style blocks, keeping the words', () => {
    expect(cleanText('<p>Drill <b>Bosch</b></p><!-- x --><script>alert(1)</script>')).toBe('Drill Bosch');
  });

  it('removes a stray `<` that could open a tag, but keeps comparisons', () => {
    expect(cleanText('a <img src=x onerror=alert(1)')).toBe('a img src=x onerror=alert(1)');
    expect(cleanText('5 > 3 and 2 < 4')).toBe('5 > 3 and 2 < 4');
  });

  it('trims, drops control characters and keeps at most one empty line', () => {
    expect(cleanText('  one\u0000\r\n\r\n\r\n\r\ntwo\t ')).toBe('one\n\ntwo');
  });
});
