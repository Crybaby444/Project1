import { describe, expect, it } from 'vitest';
import { move } from './reorder';

describe('move', () => {
  it('moves an item to a new place and shifts the others', () => {
    expect(move(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(move(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(move(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });

  it('stays inside the list', () => {
    expect(move(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(move(['a', 'b', 'c'], 2, 5)).toEqual(['a', 'b', 'c']);
  });
});
