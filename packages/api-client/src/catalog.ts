import type { Anime, Book, AnimeRegionFilter } from '@hanacg/domain';
import type { NetworkClient } from '@hanacg/platform';
import type { DiscoveryRepository } from './index';
import type { BookRepository } from './books';
import { parseStoredAnime } from './playback';
const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};
function items(v: unknown): unknown[] {
  const data = object(v).items;
  if (!Array.isArray(data)) throw new Error('目录响应无效');
  return data;
}
function anime(v: unknown): Anime {
  const parsed = parseStoredAnime(v);
  if (!parsed) throw new Error('番剧资料无效');
  const weekday = object(v).weekday;
  return {
    ...parsed,
    ...(Number.isInteger(weekday) && Number(weekday) >= 1 && Number(weekday) <= 7
      ? { weekday: Number(weekday) }
      : {}),
  };
}
export function createCatalogRepository(network: NetworkClient): DiscoveryRepository {
  const get = async (path: string, signal?: AbortSignal) =>
    items(await network.json(path, { signal })).map(anime);
  const regionParam = (region?: AnimeRegionFilter) =>
    region && region !== 'all' ? `&region=${region}` : '';
  return {
    ranking: (signal, region) =>
      get(`/api/catalog/subjects?kind=anime&limit=24${regionParam(region)}`, signal),
    calendar: (signal) => get('/api/catalog/calendar', signal),
    search: (q, signal, region) =>
      q.trim()
        ? get(
            `/api/catalog/subjects?kind=anime&limit=24&q=${encodeURIComponent(q.trim())}${regionParam(region)}`,
            signal,
          )
        : Promise.resolve([]),
  };
}
export function createCatalogBookRepository(network: NetworkClient): BookRepository {
  return {
    async list(kind, keyword, signal) {
      const data = await network.json(
        `/api/catalog/subjects?kind=${kind}&limit=24&q=${encodeURIComponent(keyword.trim())}`,
        { signal },
      );
      return items(data).map((v) => {
        const b = object(v);
        if (
          !Number.isSafeInteger(b.id) ||
          Number(b.id) <= 0 ||
          b.kind !== kind ||
          typeof b.title !== 'string' ||
          !b.title ||
          !['originalTitle', 'cover', 'author'].every((k) => typeof b[k] === 'string') ||
          !['score', 'year'].every(
            (k) => typeof b[k] === 'number' && Number.isFinite(b[k]) && Number(b[k]) >= 0,
          ) ||
          Number(b.score) > 10 ||
          !Array.isArray(b.tags) ||
          !b.tags.every((t) => typeof t === 'string') ||
          !['连载中', '已完结', 'unknown'].includes(String(b.status))
        )
          throw new Error('书籍资料无效');
        return {
          id: Number(b.id),
          kind,
          title: b.title,
          originalTitle: String(b.originalTitle),
          cover: /^https:\/\//.test(String(b.cover)) ? String(b.cover) : '',
          author: String(b.author),
          score: Number(b.score),
          year: Number(b.year),
          tags: b.tags as string[],
          status: b.status as Book['status'],
        };
      });
    },
  };
}
