import { describe, it, expect } from 'vitest';
import { normalizeSubject, normalizeEpisodes, normalizeCalendar, date } from './normalize';
import { retryDelay } from '../sync/jobs';
const subject = {
  id: 42,
  type: 1,
  platform: '漫画',
  name: 'Example',
  series: true,
  infobox: [],
  eps: 12,
  total_episodes: 99,
  rating: { score: 0 },
};
describe('catalog import boundary', () => {
  it('separates books by category and excludes unsupported/adult content', () => {
    expect(normalizeSubject(subject)).toMatchObject({
      kind: 'manga',
      series: true,
      episodeCount: 12,
      score: null,
    });
    expect(normalizeSubject({ ...subject, platform: '小说', series: false })).toMatchObject({
      kind: 'novel',
      series: false,
    });
    expect(normalizeSubject({ ...subject, platform: '画集' })).toBeNull();
    expect(normalizeSubject({ ...subject, nsfw: true })).toBeNull();
    expect(() => normalizeSubject({ ...subject, id: '42' })).toThrow();
  });
  it('retains partial dates, special episodes and fractional numbers without fabricating progress', () => {
    expect(date('2026')).toBe('2026');
    expect(date('2026-02-30')).toBeNull();
    expect(
      normalizeEpisodes([{ id: 1, type: 1, sort: 12.5, airdate: '', name: 'SP' }])[0],
    ).toMatchObject({ type: 1, sort: 12.5, number: null, airDate: null });
    expect(() => normalizeEpisodes([{ id: 1, type: 0, sort: '1' }])).toThrow();
    expect(() => normalizeCalendar([{ weekday: { id: 8 }, items: [] }])).toThrow();
  });
  it('backs off and honors a longer upstream Retry-After', () => {
    expect(retryDelay(0)).toBe(60000);
    expect(retryDelay(3)).toBe(480000);
    expect(retryDelay(1, 3600000)).toBe(3600000);
  });
});

it('uses explicit public region labels and infobox, never a title or free-form fan tag', () => {
  expect(
    normalizeSubject({ ...subject, type: 2, name: '日本故事', tags: [{ name: '日本' }] })?.regions,
  ).toEqual([]);
  expect(normalizeSubject({ ...subject, type: 2, meta_tags: ['日本', '中国'] })?.regions).toEqual([
    'japan',
    'china',
  ]);
  expect(
    normalizeSubject({
      ...subject,
      type: 2,
      infobox: [{ key: '制片国家/地区', value: '美国 / 法国' }],
    })?.regions,
  ).toEqual(['western']);
});
