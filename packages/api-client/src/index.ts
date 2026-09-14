import type { Anime } from '@hanacg/domain';
import type { NetworkClient } from '@hanacg/platform';
import curated from './curated.json';

export const curatedAnime: readonly Anime[] = curated;
export const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const string = (value: unknown): string => (typeof value === 'string' ? value : '');
const number = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

/** Legacy calendar and v0 subjects share this explicitly validated boundary. */
export function parseAnime(value: unknown, weekday?: number): Anime | null {
  const data = record(value);
  const id = number(data.id);
  const title = string(data.name_cn) || string(data.name);
  if (!Number.isSafeInteger(id) || id <= 0 || !title || data.type !== 2 || data.nsfw === true)
    return null;
  const images = record(data.images);
  const cover = string(images.large) || string(images.common);
  const airDate = string(data.date) || string(data.air_date);
  const tags = Array.isArray(data.tags)
    ? data.tags
        .map((tag) => string(record(tag).name))
        .filter(Boolean)
        .slice(0, 8)
    : [];
  return {
    id,
    title,
    originalTitle: string(data.name),
    summary: string(data.summary),
    cover: /^https:\/\//.test(cover) ? cover : '',
    score: Math.min(10, Math.max(0, number(record(data.rating).score))),
    year: Number(airDate.slice(0, 4)) || 0,
    airDate,
    episodes: Math.max(0, number(data.eps) || number(data.eps_count)),
    tags,
    ...(weekday ? { weekday } : {}),
  };
}
function parseList(value: unknown): Anime[] {
  if (!Array.isArray(value)) throw new Error('番剧数据格式异常');
  const entries = value
    .map((item) => parseAnime(item))
    .filter((item): item is Anime => item !== null);
  return [...new Map(entries.map((item) => [item.id, item])).values()];
}
export interface DiscoveryRepository {
  calendar(signal?: AbortSignal): Promise<Anime[]>;
  ranking(signal?: AbortSignal): Promise<Anime[]>;
  search(keyword: string, signal?: AbortSignal): Promise<Anime[]>;
}
export function createBangumiRepository(
  network: NetworkClient,
  baseUrl = 'https://api.bgm.tv',
): DiscoveryRepository {
  const base = baseUrl.replace(/\/$/, '');
  if (!/^https:\/\//.test(base)) throw new Error('Bangumi endpoint must use HTTPS');
  return {
    async calendar(signal) {
      const data = await network.json(`${base}/calendar`, { signal });
      if (!Array.isArray(data)) throw new Error('放送表数据格式异常');
      return data.flatMap((day) => {
        const group = record(day);
        const weekday = number(record(group.weekday).id);
        if (weekday < 1 || weekday > 7 || !Number.isInteger(weekday)) return [];
        if (!Array.isArray(group.items)) return [];
        return group.items
          .map((item) => parseAnime(item, weekday))
          .filter((item): item is Anime => item !== null);
      });
    },
    async ranking(signal) {
      const data = record(
        await network.json(`${base}/v0/subjects?type=2&sort=rank&limit=24&offset=0`, { signal }),
      );
      return parseList(data.data);
    },
    async search(keyword, signal) {
      if (!keyword.trim()) return [];
      const data = record(
        await network.json(`${base}/v0/search/subjects?limit=24&offset=0`, {
          method: 'POST',
          body: { keyword: keyword.trim(), sort: 'match', filter: { type: [2] } },
          signal,
        }),
      );
      return parseList(data.data);
    },
  };
}
