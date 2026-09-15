import { it, expect } from 'vitest';
import { readHistory } from './history';
import { curatedAnime } from '@hanacg/api-client';
it('rejects damaged, wrong-version, and invalid progress history', () => {
  const storage = (value: string) => ({ getItem: () => value, setItem: () => true });
  expect(readHistory(storage('{broken'))).toEqual([]);
  expect(readHistory(storage('{"version":2,"entries":[]}'))).toEqual([]);
  const entry = {
    anime: curatedAnime[0],
    sourceId: 'a',
    subjectId: 's',
    lineId: 'l',
    episodeId: 'e',
    episodeTitle: '第一集',
    position: 12,
    duration: 60,
    updatedAt: 1,
  };
  const result = readHistory(
    storage(JSON.stringify({ version: 1, entries: [entry, { ...entry, position: -2 }] })),
  );
  expect(result).toHaveLength(1);
  expect(result[0]?.position).toBe(12);
});
it('keeps the newest record when persisted entries contain duplicates', () => {
  const entry = {
    anime: curatedAnime[0],
    sourceId: 'a',
    subjectId: 's',
    lineId: 'l',
    episodeId: 'e',
    episodeTitle: '第一集',
    position: 12,
    duration: 60,
    updatedAt: 1,
  };
  const value = JSON.stringify({
    version: 1,
    entries: [entry, { ...entry, position: 30, updatedAt: 2 }],
  });
  expect(readHistory({ getItem: () => value, setItem: () => true })[0]?.position).toBe(30);
});
