import { describe, expect, it } from 'vitest';
import { readSaved } from './index';
import { curatedAnime } from '@hanacg/api-client';

describe('saved anime recovery', () => {
  const storage = (value: string) => ({ getItem: () => value, setItem: () => true });
  it('recovers valid saved metadata while dropping corrupt entries and duplicates', () => {
    const first = curatedAnime[0]!;
    expect(readSaved(storage(JSON.stringify([first, null, { title: 'invalid' }, first])))).toEqual([
      first,
    ]);
  });
  it('does not crash on corrupt JSON or unexpected schema', () => {
    for (const value of ['invalid', 'null', '{}', '42'])
      expect(readSaved(storage(value))).toEqual([]);
  });
});
