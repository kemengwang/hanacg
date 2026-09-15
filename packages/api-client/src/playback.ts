import type { Anime } from '@hanacg/domain';
import type { NetworkClient, MediaResource } from '@hanacg/platform';
import type { PlaybackRepository, SourceSearchResult, SourceLine } from '@hanacg/source-engine';
import { record } from './index';

function str(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('播放服务数据格式异常');
  return value;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('播放服务数据格式异常');
  return value;
}
function safeUrl(value: unknown, media = false): string {
  const url = str(value);
  if (media ? !/^\/api\/media\/[a-zA-Z0-9_-]+$/.test(url) : !/^https:\/\//.test(url))
    throw new Error('播放服务地址无效');
  return url;
}
export function parseSourceResults(value: unknown): SourceSearchResult[] {
  return array(record(value).results).map((v) => {
    const item = record(v);
    const source = record(item.source);
    const sourceId = str(source.id);
    return {
      source: { id: sourceId, name: str(source.name), homepage: safeUrl(source.homepage) },
      matches: array(item.matches).map((v) => {
        const match = record(v);
        if (
          match.sourceId !== sourceId ||
          !['metadata', 'title', 'candidate'].includes(String(match.matchedBy))
        )
          throw new Error('来源匹配数据异常');
        return {
          sourceId,
          subjectId: str(match.subjectId),
          title: str(match.title),
          url: safeUrl(match.url),
          matchedBy: match.matchedBy as 'metadata' | 'title' | 'candidate',
        };
      }),
      ...(typeof item.error === 'string' ? { error: item.error } : {}),
    };
  });
}
export function parseLines(value: unknown): SourceLine[] {
  return array(record(value).lines).map((v) => {
    const line = record(v);
    return {
      id: str(line.id),
      name: str(line.name),
      episodes: array(line.episodes).map((v) => {
        const e = record(v);
        if (typeof e.number !== 'number' || !Number.isFinite(e.number) || e.number < 0)
          throw new Error('分集序号无效');
        return { id: str(e.id), title: str(e.title), number: e.number };
      }),
    };
  });
}
export function parseMedia(value: unknown): MediaResource {
  const resource = record(record(value).resource);
  return {
    url: safeUrl(resource.url, true),
    ...(typeof resource.mimeType === 'string' ? { mimeType: resource.mimeType } : {}),
  };
}
/** Validate our domain-shaped metadata independently of Bangumi's wire format. */
export function parseStoredAnime(value: unknown): Anime | null {
  const v = record(value);
  if (
    !Number.isSafeInteger(v.id) ||
    Number(v.id) <= 0 ||
    typeof v.title !== 'string' ||
    !v.title ||
    typeof v.originalTitle !== 'string' ||
    typeof v.summary !== 'string' ||
    typeof v.airDate !== 'string' ||
    typeof v.cover !== 'string' ||
    !['score', 'year', 'episodes'].every(
      (key) => typeof v[key] === 'number' && Number.isFinite(v[key]) && Number(v[key]) >= 0,
    ) ||
    !Array.isArray(v.tags) ||
    !v.tags.every((t) => typeof t === 'string')
  )
    return null;
  return {
    id: Number(v.id),
    title: v.title,
    originalTitle: v.originalTitle,
    summary: v.summary,
    airDate: v.airDate,
    cover: /^(https:\/\/|\/artwork\/[a-z-]+\.jpg$)/.test(v.cover) ? v.cover : '',
    score: Number(v.score),
    year: Number(v.year),
    episodes: Number(v.episodes),
    tags: v.tags,
  };
}
export function createPlaybackRepository(
  network: NetworkClient,
): PlaybackRepository & { anime(id: number, signal?: AbortSignal): Promise<Anime> } {
  const get = (path: string, params: Record<string, string | number>, signal?: AbortSignal) =>
    network.json(
      `/api/${path}?${Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')}`,
      { signal },
    );
  return {
    async anime(id, signal) {
      const data = await network.json(`/api/anime/${id}`, { signal });
      const anime = parseStoredAnime(record(data).anime);
      if (!anime) throw new Error('未能读取番剧资料');
      return anime;
    },
    async search(query, signal) {
      return parseSourceResults(await get('playback/search', { ...query }, signal));
    },
    async episodes(sourceId, subjectId, signal) {
      return parseLines(await get('playback/episodes', { sourceId, subjectId }, signal));
    },
    async resolve(sourceId, subjectId, lineId, episodeId, signal) {
      return parseMedia(
        await get('playback/resolve', { sourceId, subjectId, lineId, episodeId }, signal),
      );
    },
  };
}
