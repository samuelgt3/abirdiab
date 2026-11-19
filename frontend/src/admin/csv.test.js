import { describe, it, expect } from 'vitest';
import { csvCell, toCsv } from './csv.js';

describe('csv export', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(0)).toBe('0');
  });
  it('defuses spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell('+123')).toBe("'+123");
    expect(csvCell('@cmd')).toBe("'@cmd");
  });
  it('builds a table with Arabic text intact', () => {
    const csv = toCsv([{ n: 'رنا', e: 'a@b.co' }], [{ header: 'Name', value: (r) => r.n }, { header: 'Email', value: (r) => r.e }]);
    expect(csv).toBe('Name,Email\r\nرنا,a@b.co');
  });
});
