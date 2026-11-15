import { describe, expect, it } from 'vitest';
import { csvCell } from './admin-system.controller';

describe('csvCell', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('never lets a spreadsheet read a cell as a formula', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('@cmd')).toBe("'@cmd");
  });

  it('writes dates as ISO and empty for nothing', () => {
    expect(csvCell(new Date('2026-11-15T10:00:00.000Z'))).toBe('2026-11-15T10:00:00.000Z');
    expect(csvCell(null)).toBe('');
  });
});
