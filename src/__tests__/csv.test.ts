import { describe, expect, it } from 'vitest';
import { csvCell } from '../utils/csv';

describe('csvCell', () => {
  it('always quotes a plain cell', () => {
    expect(csvCell('hello world')).toBe('"hello world"');
  });

  it('doubles embedded double quotes', () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('guards cells that start with a formula or command character', () => {
    expect(csvCell('=SUM(A1:A2)')).toBe('"\'=SUM(A1:A2)"');
    expect(csvCell('+1+1')).toBe('"\'+1+1"');
    expect(csvCell('-2+3')).toBe('"\'-2+3"');
    expect(csvCell('@cmd')).toBe('"\'@cmd"');
  });

  it('leaves already-safe values untouched apart from quoting', () => {
    expect(csvCell('00:05')).toBe('"00:05"');
    expect(csvCell('2nd item')).toBe('"2nd item"');
  });
});
