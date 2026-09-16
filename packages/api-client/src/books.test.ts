import { describe, expect, it, vi } from 'vitest';
import { createBangumiBookRepository, parseBook } from './books';
import { filterBooks } from '@hanacg/domain';

const raw = {
  id: 10,
  type: 1,
  platform: '小说',
  name: 'Novel',
  name_cn: '测试小说',
  date: '2024-01-01',
  images: { large: 'https://example.org/cover.jpg' },
  rating: { score: 8.4 },
  meta_tags: ['小说', '已完结'],
  tags: [{ name: '奇幻' }, { name: '连载中' }],
  infobox: [{ key: '作者', value: [{ v: '作者一' }, { v: '作者二' }] }],
};
describe('book metadata and filtering', () => {
  it('keeps novels and manga separate, rejects invalid identities and unsafe fields', () => {
    for (const value of [
      null,
      {},
      { ...raw, id: 1.1 },
      { ...raw, id: -1 },
      { ...raw, type: 2 },
      { ...raw, nsfw: true },
      { ...raw, platform: '画集' },
    ])
      expect(parseBook(value, 'novel')).toBeNull();
    expect(parseBook(raw, 'manga')).toBeNull();
    expect(
      parseBook({ ...raw, date: null, infobox: [{ key: '发售日', value: '1866-01' }] }, 'novel')
        ?.year,
    ).toBe(1866);
    expect(parseBook({ ...raw, date: '1879' }, 'novel')?.year).toBe(1879);
    expect(parseBook({ ...raw, date: '2024-99-00' }, 'novel')?.year).toBe(0);
    expect(parseBook(raw, 'novel')).toMatchObject({
      author: '作者一 / 作者二',
      status: '已完结',
      kind: 'novel',
      year: 2024,
    });
    expect(
      parseBook(
        {
          ...raw,
          images: { large: 'javascript:alert(1)' },
          rating: { score: NaN },
          date: 'unknown',
          meta_tags: [],
        },
        'novel',
      ),
    ).toMatchObject({ cover: '', score: 0, year: 0, status: 'unknown' });
    expect(parseBook({ ...raw, meta_tags: ['连载中', '已完结'] }, 'novel')?.status).toBe('unknown');
  });
  it('requests exact browse categories, scopes keyword search and propagates cancellation', async () => {
    const json = vi.fn().mockResolvedValue({ data: [raw, raw, { ...raw, type: 2 }] });
    const repository = createBangumiBookRepository({ json });
    const signal = new AbortController().signal;
    expect(await repository.list('novel', '', signal)).toHaveLength(1);
    expect(json).toHaveBeenLastCalledWith(expect.stringContaining('cat=1002'), { signal });
    await repository.list('manga', '', signal);
    expect(json).toHaveBeenLastCalledWith(expect.stringContaining('cat=1001'), { signal });
    await repository.list('novel', '  狼  ', signal);
    expect(json).toHaveBeenLastCalledWith(expect.stringContaining('/v0/search/subjects'), {
      signal,
      method: 'POST',
      body: {
        keyword: '狼',
        sort: 'match',
        filter: { type: [1], meta_tags: ['小说'], nsfw: false },
      },
    });
    json.mockResolvedValue({ unexpected: true });
    await expect(repository.list('novel', '')).rejects.toThrow('格式异常');
  });
  it('combines filters and does not infer missing statuses, scores or years', () => {
    const book = parseBook(raw, 'novel')!;
    const books = [
      book,
      { ...book, id: 11, score: 9, year: 2025 },
      { ...book, id: 12, status: 'unknown' as const, score: 0, year: 0 },
    ];
    const query = {
      genre: '全部',
      status: 'all' as const,
      year: 0,
      minScore: 0,
      sort: 'recommended' as const,
    };
    expect(
      filterBooks(books, { ...query, genre: '奇幻', year: 2024, status: '已完结', minScore: 8 }),
    ).toEqual([book]);
    expect(filterBooks(books, { ...query, status: '连载中' })).toEqual([]);
    expect(filterBooks(books, { ...query, sort: 'year' }).map((item) => item.id)).toEqual([
      11, 10, 12,
    ]);
    expect(filterBooks(books, { ...query, sort: 'score' }).map((item) => item.id)).toEqual([
      11, 10, 12,
    ]);
    expect(books.map((item) => item.id)).toEqual([10, 11, 12]);
  });
});
