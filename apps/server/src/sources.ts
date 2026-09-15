import { load } from 'cheerio';
import {
  matchTitle,
  rankMatches,
  type SourceAdapter,
  type SourceLine,
} from '@hanacg/source-engine';
import type { MediaResource } from '@hanacg/platform';
import { checkedUrl, type SourceHost } from './network';

const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const string = (v: unknown) => (typeof v === 'string' ? v : '');
const id = (v: unknown) =>
  typeof v === 'number' && Number.isSafeInteger(v) ? String(v) : string(v);
function list(v: unknown): unknown[] {
  if (!Array.isArray(v)) throw new Error('来源数据结构已变化，请切换来源');
  return v;
}
const agent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';
export function parseAnime7Lines(html: string): SourceLine[] {
  const $ = load(html);
  const names = $('.hl-plays-from a')
    .map((_, e) => $(e).text().trim())
    .get();
  return $('ul.hl-plays-list')
    .toArray()
    .flatMap((element, index) => {
      const episodes = $(element)
        .find('a')
        .toArray()
        .flatMap((a) => {
          const match = $(a)
            .attr('href')
            ?.match(/^\/vod-play\/(\d+)-(\d+)-(\d+)\/$/);
          return match
            ? [
                {
                  id: `${match[1]}-${match[2]}-${match[3]}`,
                  title: $(a).text().trim() || `第 ${match[3]} 集`,
                  number: Number(match[3]),
                },
              ]
            : [];
        });
      return episodes.length
        ? [
            {
              id: episodes[0]!.id.split('-')[1]!,
              name: names[index] || `线路 ${index + 1}`,
              episodes,
            },
          ]
        : [];
    });
}
export function parseAnime7Media(html: string): MediaResource {
  // Parse data only. Never evaluate a third-party script.
  const raw = html.match(/(?:var\s+)?player_aaaa\s*=\s*(\{[^\n]*?\})\s*;?\s*<\/script>/)?.[1];
  if (!raw) throw new Error('未找到可直接播放的地址，请切换来源');
  const data = object(JSON.parse(raw) as unknown);
  let url = string(data.url);
  if (data.encrypt === 2) url = decodeURIComponent(Buffer.from(url, 'base64').toString('utf8'));
  else if (data.encrypt === 1) url = decodeURIComponent(url);
  const parsed = checkedUrl(url);
  const hls = /\.m3u8$/i.test(parsed.pathname);
  if (!hls && !/\.(mp4|webm)$/i.test(parsed.pathname))
    throw new Error('此线路需要额外解析，暂不支持，请切换来源');
  return {
    url: parsed.href,
    mimeType: hls
      ? 'application/vnd.apple.mpegurl'
      : /\.webm$/i.test(parsed.pathname)
        ? 'video/webm'
        : 'video/mp4',
  };
}
export function createAnime7(host: SourceHost): SourceAdapter {
  const base = 'https://anime7.top';
  const headers = { Referer: `${base}/`, 'User-Agent': agent };
  return {
    info: { id: 'anime7', name: 'Anime7', homepage: base },
    async search(query, signal) {
      const data = object(
        await host.json(
          `${base}/index.php/ajax/suggest?mid=1&wd=${encodeURIComponent(query.title)}`,
          signal,
          headers,
        ),
      );
      return rankMatches(
        list(data.list).flatMap((value) => {
          const item = object(value);
          const subjectId = id(item.id);
          const title = string(item.name);
          return /^\d+$/.test(subjectId) && title
            ? [
                {
                  sourceId: 'anime7',
                  subjectId,
                  title,
                  url: `${base}/vod-detail/${subjectId}/`,
                  matchedBy: matchTitle(title, query),
                },
              ]
            : [];
        }),
      );
    },
    async episodes(subjectId, signal) {
      if (!/^\d+$/.test(subjectId)) throw new Error('来源条目无效');
      return parseAnime7Lines(await host.text(`${base}/vod-detail/${subjectId}/`, signal, headers));
    },
    async resolve(subjectId, lineId, episodeId, signal) {
      if (!/^\d+-\d+-\d+$/.test(episodeId) || !episodeId.startsWith(`${subjectId}-${lineId}-`))
        throw new Error('分集不属于当前来源');
      return {
        ...parseAnime7Media(await host.text(`${base}/vod-play/${episodeId}/`, signal, headers)),
        headers,
      };
    },
  };
}
export function createTvt(host: SourceHost): SourceAdapter {
  const base = 'https://www.tvtfun.net';
  const headers = { Referer: `${base}/`, 'User-Agent': agent };
  async function detail(subjectId: string, signal?: AbortSignal) {
    if (!/^[a-zA-Z0-9_-]+$/.test(subjectId)) throw new Error('来源条目无效');
    return object(object(await host.json(`${base}/api/videos/${subjectId}`, signal, headers)).data);
  }
  return {
    info: { id: 'tvtfun', name: 'TvTFun', homepage: base },
    async search(query, signal) {
      const data = object(
        object(
          await host.json(
            `${base}/api/videos/search?q=${encodeURIComponent(query.title)}`,
            signal,
            headers,
          ),
        ).data,
      );
      return rankMatches(
        list(data.videos).flatMap((value) => {
          const item = object(value);
          const subjectId = id(item.id);
          const title = string(item.name);
          return /^[a-zA-Z0-9_-]+$/.test(subjectId) && title
            ? [
                {
                  sourceId: 'tvtfun',
                  subjectId,
                  title,
                  url: `${base}/video/${encodeURIComponent(string(item.slug) || subjectId)}`,
                  matchedBy: matchTitle(
                    title,
                    query,
                    typeof item.bgmId === 'number' ? item.bgmId : undefined,
                  ),
                },
              ]
            : [];
        }),
      );
    },
    async episodes(subjectId, signal) {
      const data = await detail(subjectId, signal);
      return list(data.playSources).flatMap((value) => {
        const line = object(value);
        const lineId = id(line.id);
        if (!lineId) return [];
        const episodes = list(line.episodes).flatMap((v, index) => {
          const e = object(v);
          const episodeId = id(e.id);
          return episodeId
            ? [
                {
                  id: episodeId,
                  title: string(e.name) || `第 ${index + 1} 集`,
                  number: typeof e.sort === 'number' ? e.sort + 1 : index + 1,
                },
              ]
            : [];
        });
        return [{ id: lineId, name: string(line.name) || '播放线路', episodes }];
      });
    },
    async resolve(subjectId, lineId, episodeId, signal) {
      const data = await detail(subjectId, signal);
      const lines = list(data.playSources).map(object);
      const lineIndex = lines.findIndex((s) => id(s.id) === lineId);
      const episodes = list(lines[lineIndex]?.episodes).map(object);
      const episodeIndex = episodes.findIndex((e) => id(e.id) === episodeId);
      if (episodeIndex < 0) throw new Error('分集不属于当前来源');
      const playPage = `${base}/video/${encodeURIComponent(string(data.slug))}/play?source=${lineIndex}&episode=${episodeIndex}`;
      await host.text(playPage, signal, headers);
      const resolved = object(
        object(
          await host.json(
            `${base}/api/videos/resolve-play-url?episodeId=${encodeURIComponent(episodeId)}`,
            signal,
            {
              ...headers,
              Referer: playPage,
            },
          ),
        ).data,
      );
      const url = string(resolved.url);
      if (!url) throw new Error('来源未返回播放地址，请重试或换源');
      checkedUrl(url);
      const mediaHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(object(resolved.headers)))
        if (
          ['referer', 'origin', 'user-agent', 'cookie'].includes(key.toLowerCase()) &&
          typeof value === 'string' &&
          !/[\r\n]/.test(value)
        )
          mediaHeaders[key === 'cookie' ? 'Cookie' : key] = value;
      return {
        url,
        headers: mediaHeaders,
        ...(/\.m3u8(?:\?|$)/i.test(url) ? { mimeType: 'application/vnd.apple.mpegurl' } : {}),
      };
    },
  };
}
