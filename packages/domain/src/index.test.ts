import { describe, expect, it } from 'vitest';
import { filterAnime, type Anime } from './index';

const anime = (id: number, title: string, score: number, tags: string[]): Anime => ({
  id,
  title,
  originalTitle: title,
  score,
  tags,
  cover: '',
  year: 2023,
  episodes: 12,
  summary: '',
  airDate: '2023-01-01',
});
const items = [
  anime(1, '孤独摇滚', 8.6, ['音乐', '青春']),
  anime(2, '葬送的芙莉莲', 8.8, ['冒险']),
  anime(3, 'ＡＢＣ', 7, ['音乐']),
];
describe('discovery filtering', () => {
  it('combines keyword and genre, ignoring whitespace and full-width case', () => {
    expect(
      filterAnime(items, { keyword: ' abc ', genre: '音乐', sort: 'recommended' }).map((a) => a.id),
    ).toEqual([3]);
    expect(filterAnime(items, { keyword: '芙莉莲', genre: '音乐', sort: 'recommended' })).toEqual(
      [],
    );
  });
  it('sorts a copy without mutating the curated ordering', () => {
    expect(
      filterAnime(items, { keyword: '', genre: '全部', sort: 'score' }).map((a) => a.id),
    ).toEqual([2, 1, 3]);
    expect(items.map((a) => a.id)).toEqual([1, 2, 3]);
  });
});
