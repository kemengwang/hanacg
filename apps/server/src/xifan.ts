import { load } from 'cheerio';
import {
  matchTitle,
  rankMatches,
  type SourceAdapter,
  type SourceLine,
} from '@hanacg/source-engine';
import { checkedUrl, type SourceHost } from './network';
const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const string = (v: unknown) => (typeof v === 'string' ? v : '');
/** Read the site's serialized data as JSON, never execute its React/JS payload. */
export function parseXifanLines(html: string): SourceLine[] {
  const $ = load(html);
  let sources: unknown[] = [];
  function visit(v: unknown, depth = 0): void {
    if (depth > 30) return;
    if (Array.isArray(v)) {
      v.forEach((x) => visit(x, depth + 1));
      return;
    }
    const item = object(v);
    if (Array.isArray(item.sources)) sources = item.sources;
    for (const child of Object.values(item))
      if (child && typeof child === 'object') visit(child, depth + 1);
  }
  $('script').each((_, element) => {
    const script = $(element).text();
    const match = script.match(/^self\.__next_f\.push\((.*)\)\s*;?$/s);
    if (!match) return;
    try {
      const envelope: unknown = JSON.parse(match[1]!);
      if (!Array.isArray(envelope) || typeof envelope[1] !== 'string') return;
      for (const row of envelope[1].split('\n')) {
        const json = row.replace(/^[\da-f]+:/i, '');
        if (!json.startsWith('[') && !json.startsWith('{')) continue;
        try {
          visit(JSON.parse(json) as unknown);
        } catch {
          /* Not a JSON data row. */
        }
      }
    } catch {
      /* Ignore unrelated scripts. */
    }
  });
  // This adapter explicitly supports the site's default native HLS lane. External fallback
  // lanes may use different resolvers and are not presented as interchangeable HLS sources.
  const native = sources.map(object).find((s) => /^xfy/.test(string(s.code)));
  if (!native || !Array.isArray(native.episodes)) throw new Error('此番剧暂无支持的默认 HLS 线路');
  const episodes = native.episodes.flatMap((v) => {
    const e = object(v);
    if (
      !Number.isSafeInteger(e.id) ||
      !Number.isFinite(e.episode_number) ||
      Number(e.episode_number) < 0
    )
      return [];
    return [
      {
        id: String(e.id),
        number: Number(e.episode_number),
        title: `第 ${e.episode_number} 集${string(e.title) ? ` · ${e.title}` : ''}`,
      },
    ];
  });
  return [{ id: 'hls', name: '默认 HLS', episodes }];
}
export function createXifan(host: SourceHost): SourceAdapter {
  const base = 'https://next.xifanacg.com';
  const api = 'https://rzmsnqblptbceicadbyd.supabase.co';
  // Publishable key embedded in the source site's public client, not a service-role secret.
  const headers = {
    apikey: 'sb_publishable_aCb7uwyLN6H-sMjze4dRGA_2MDuROLF',
    Origin: base,
    Referer: `${base}/`,
  };
  return {
    info: { id: 'xifan', name: '稀饭动漫', homepage: base },
    async search(query, signal) {
      if (!host.post) throw new Error('宿主不支持 JSON POST');
      const data = await host.post(
        `${api}/rest/v1/rpc/search_animes`,
        { search_term: query.title },
        signal,
        headers,
      );
      if (!Array.isArray(data)) throw new Error('来源数据异常');
      return rankMatches(
        data.flatMap((v) => {
          const e = object(v);
          if (!Number.isSafeInteger(e.id) || !string(e.title)) return [];
          return [
            {
              sourceId: 'xifan',
              subjectId: String(e.id),
              title: string(e.title),
              url: `${base}/anime/${e.id}`,
              matchedBy: matchTitle(
                string(e.title),
                query,
                typeof e.bangumi_id === 'number' ? e.bangumi_id : undefined,
              ),
            },
          ];
        }),
      );
    },
    async episodes(subjectId, signal) {
      if (!/^\d+$/.test(subjectId)) throw new Error('无效的来源条目');
      return parseXifanLines(
        await host.text(`${base}/anime/${subjectId}`, signal, {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
          Referer: `${base}/`,
        }),
      );
    },
    async resolve(subjectId, lineId, episodeId, signal) {
      if (lineId !== 'hls' || !/^\d+$/.test(episodeId) || !host.post)
        throw new Error('无效的 HLS 分集');
      const data = object(
        await host.post(
          `${api}/functions/v1/issue-web-playback`,
          { action: 'hls', episode_id: Number(episodeId) },
          signal,
          headers,
        ),
      );
      if (
        data.ok !== true ||
        String(data.anime_id) !== subjectId ||
        String(data.episode_id) !== episodeId ||
        data.resolved_action !== 'hls'
      )
        throw new Error('此分集的 HLS 地址暂不可用');
      return { url: checkedUrl(string(data.url)).href, mimeType: 'application/vnd.apple.mpegurl' };
    },
  };
}
