import { describe, expect, it, vi } from 'vitest';
import { createBangumiRepository, parseAnime, curatedAnime } from './index';

const subject = {
  id: 123,
  type: 2,
  name: '作品',
  date: '2024-01-01',
  images: { large: 'https://example.org/cover.jpg' },
  rating: { score: 8.4 },
};
describe('Bangumi boundary', () => {
  it('rejects invalid identities, non-animation and malformed external data', () => {
    for (const value of [
      null,
      [],
      {},
      { ...subject, type: 1 },
      { ...subject, id: -1 },
      { ...subject, id: 2.5 },
      { ...subject, nsfw: true },
    ])
      expect(parseAnime(value)).toBeNull();
    expect(parseAnime({ ...subject, images: { large: 'javascript:alert(1)' } })?.cover).toBe('');
    expect(parseAnime({ ...subject, rating: { score: 100 } })?.score).toBe(10);
  });
  it('normalizes legacy metadata and optional fields', () => {
    expect(
      parseAnime(
        {
          id: 1,
          type: 2,
          name: '日文名',
          name_cn: '中文名',
          air_date: '2020-04-03',
          eps_count: 12,
        },
        5,
      ),
    ).toMatchObject({
      title: '中文名',
      originalTitle: '日文名',
      year: 2020,
      episodes: 12,
      score: 0,
      tags: [],
      weekday: 5,
    });
  });
  it('keeps calendar weekday mapping and filters malformed entries', async () => {
    const json = vi.fn().mockResolvedValue([
      { weekday: { id: 2 }, items: [subject, null] },
      { weekday: { id: 9 }, items: [subject] },
    ]);
    const result = await createBangumiRepository({ json }).calendar();
    expect(result).toHaveLength(1);
    expect(result[0]?.weekday).toBe(2);
    expect(json).toHaveBeenCalledWith('https://api.bgm.tv/calendar', { signal: undefined });
  });
  it('forwards search cancellation, does not send blank keywords, deduplicates results', async () => {
    const json = vi.fn().mockResolvedValue({ data: [subject, subject] });
    const repo = createBangumiRepository({ json });
    expect(await repo.search(' ')).toEqual([]);
    expect(json).not.toHaveBeenCalled();
    const controller = new AbortController();
    expect(await repo.search('  作品 ', controller.signal)).toHaveLength(1);
    expect(json).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        signal: controller.signal,
        body: { keyword: '作品', sort: 'match', filter: { type: [2] } },
      }),
    );
  });
  it('surfaces invalid payloads instead of silently treating them as empty results', async () => {
    const repo = createBangumiRepository({ json: async () => ({ unexpected: true }) });
    await expect(repo.ranking()).rejects.toThrow('格式异常');
    await expect(repo.calendar()).rejects.toThrow('格式异常');
  });
  it('keeps the offline catalog complete and uniquely identified', () => {
    expect(curatedAnime).toHaveLength(11);
    expect(new Set(curatedAnime.map((entry) => entry.id)).size).toBe(11);
    expect(curatedAnime.every((entry) => entry.title && entry.cover && entry.score > 0)).toBe(true);
  });
});
