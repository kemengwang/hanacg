import { it, expect } from 'vitest';
import { matchTitle, rankMatches } from './index';
it('does not mistake a different season for an exact match', () => {
  const q = { animeId: 1, title: '葬送的芙莉莲', originalTitle: '葬送のフリーレン' };
  expect(matchTitle('葬送的芙莉莲 第二季', q)).toBe('candidate');
  expect(matchTitle('葬送 の フリーレン', q)).toBe('title');
  expect(matchTitle('葬送的芙莉莲', q, 2)).toBe('candidate');
  expect(matchTitle('译名不同', q, 1)).toBe('metadata');
  expect(rankMatches([])).toEqual([]);
});
