import { createDecipheriv } from 'node:crypto';
import { load } from 'cheerio';
import { record } from '@hanacg/api-client';
import {
  matchTitle,
  rankMatches,
  type SourceAdapter,
  type SourceLine,
  type SourceMatch,
  type SourceQuery,
} from '@hanacg/source-engine';
import type { MediaResource } from '@hanacg/platform';
import { checkedUrl, type SourceHost } from './network';

const base = 'https://www.omofuna.com';
export const omofunPlayerOrigin = 'https://art.v2player.top:8989';
const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
  Referer: `${base}/`,
};
const supportedLines = new Set(['天堂', '精品', '暴风', '量子']);
const supportedPlayers = new Set(['dyttm3u8', 'mp4', 'bfzym3u8', 'lzm3u8']);
const string = (value: unknown) => (typeof value === 'string' ? value : '');
const subjectPattern = /^[a-f0-9]{24}$/;

export class OmofunSearchVerificationError extends Error {
  constructor() {
    super('Omofun 搜索需要网页验证，可在来源搜索框粘贴该站的番剧详情或播放链接。');
  }
}

function subjectFromLink(value: string): string | undefined {
  const url = checkedUrl(new URL(value, base).href);
  if (url.origin !== base) return;
  return url.pathname.match(
    /^\/anime\/([a-f0-9]{24})(?:\.html|\/play\/[1-9]\d*\/[1-9]\d*\.html)$/,
  )?.[1];
}

export function parseOmofunSearch(html: string, query: SourceQuery): SourceMatch[] {
  const $ = load(html);
  if ($('.verify_submit, .mac_verify').length || $('title').text().includes('系统安全验证'))
    throw new OmofunSearchVerificationError();
  const matches = new Map<string, SourceMatch>();
  // Search result titles only: do not turn recommendations/footer links into matches.
  $('h3 a[href], h4 a[href]').each((_, element) => {
    const href = $(element).attr('href') || '';
    let subjectId: string | undefined;
    try {
      subjectId = subjectFromLink(href);
    } catch {
      return;
    }
    const title = $(element).text().trim();
    if (subjectId && title)
      matches.set(subjectId, {
        sourceId: 'omofun',
        subjectId,
        title,
        url: `${base}/anime/${subjectId}.html`,
        matchedBy: matchTitle(title, query),
      });
  });
  if (!matches.size && !$('title').text().includes('搜索') && !html.includes('没有找到'))
    throw new Error('Omofun 搜索页面结构已变化');
  return rankMatches([...matches.values()]);
}

export function parseOmofunLines(html: string, subjectId: string): SourceLine[] {
  if (!subjectPattern.test(subjectId)) throw new Error('来源条目无效');
  const $ = load(html);
  return $('.channel-tab a[href^="#playlist"]')
    .toArray()
    .flatMap((element) => {
      const lineId = $(element)
        .attr('href')
        ?.match(/^#playlist([1-9]\d*)$/)?.[1];
      const name = $(element).clone().children().remove().end().text().trim();
      if (!lineId || !supportedLines.has(name)) return [];
      const episodes = new Map<string, SourceLine['episodes'][number]>();
      $(`#playlist${lineId} .play-list-content a[href]`).each((_, link) => {
        const match = $(link)
          .attr('href')
          ?.match(/^\/anime\/([a-f0-9]{24})\/play\/([1-9]\d*)\/([1-9]\d*)\.html$/);
        if (!match || match[1] !== subjectId || match[2] !== lineId) return;
        const id = `${lineId}-${match[3]}`;
        episodes.set(id, {
          id,
          title: $(link).text().trim() || `第 ${match[3]} 集`,
          number: Number(match[3]),
        });
      });
      return [{ id: lineId, name, episodes: [...episodes.values()] }];
    });
}

function playerData(html: string) {
  const raw = html.match(/(?:var\s+)?player_aaaa\s*=\s*(\{[^\n]*?\})\s*;?\s*<\/script>/)?.[1];
  if (!raw) throw new Error('未找到 Omofun 播放数据');
  const data = record(JSON.parse(raw) as unknown);
  let url = string(data.url);
  if (data.encrypt === 1) url = decodeURIComponent(url);
  else if (data.encrypt === 2)
    url = decodeURIComponent(Buffer.from(url, 'base64').toString('utf8'));
  else if (data.encrypt !== 0 && data.encrypt !== undefined)
    throw new Error('不支持的播放数据编码');
  return { data, url };
}

export function parseOmofunPremium(html: string): MediaResource {
  // Public client data format from s6.cfhls.top/1/player/js/common.js.
  // Reimplement AES decoding; never evaluate fetched JavaScript or embed its player.
  const match = html.match(
    /\burl\s*:\s*playData\(\s*['"]([A-Za-z0-9+/=]+)['"]\s*,\s*['"]([a-fA-F0-9]{32})['"]\s*\)/,
  );
  if (!match) throw new Error('精品线路解析格式已变化，请切换线路');
  const decipher = createDecipheriv(
    'aes-128-cbc',
    Buffer.from('ABABEF777999CCCD'),
    Buffer.from(match[2]!, 'hex'),
  );
  const url = Buffer.concat([
    decipher.update(Buffer.from(match[1]!, 'base64')),
    decipher.final(),
  ]).toString('utf8');
  const media = checkedUrl(url);
  if (
    media.protocol !== 'https:' ||
    (!/\.mp4$/i.test(media.pathname) && media.searchParams.get('mime_type') !== 'video_mp4')
  )
    throw new Error('精品线路未返回有效的视频地址');
  return {
    url: media.href,
    mimeType: 'video/mp4',
    headers: { 'User-Agent': headers['User-Agent'] },
  };
}

export function createOmofun(host: SourceHost, playerHost: SourceHost = host): SourceAdapter {
  return {
    info: { id: 'omofun', name: 'Omofun', homepage: base },
    async search(query, signal) {
      const isLink = /^https?:\/\//i.test(query.title.trim());
      const preferred = query.preferredSourceId === 'omofun' ? query.preferredSubjectId : undefined;
      if (isLink || preferred) {
        const subjectId = isLink ? subjectFromLink(query.title.trim()) : preferred;
        if (!subjectId) return [];
        if (!subjectPattern.test(subjectId)) throw new Error('来源条目无效');
        const html = await host.text(`${base}/anime/${subjectId}.html`, signal, headers);
        if (!parseOmofunLines(html, subjectId).length) throw new Error('未找到支持的播放线路');
        const $ = load(html);
        const title =
          $('h1').first().text().trim() ||
          $('title')
            .text()
            .split(/免费在线观看|在线观看|详情介绍/)[0]
            ?.trim();
        if (!title) throw new Error('未找到来源标题');
        return [
          {
            sourceId: 'omofun',
            subjectId,
            title,
            url: `${base}/anime/${subjectId}.html`,
            matchedBy: 'candidate',
          },
        ];
      }
      return parseOmofunSearch(
        await host.text(
          `${base}/search/-------------.html?wd=${encodeURIComponent(query.title)}`,
          signal,
          headers,
        ),
        query,
      );
    },
    async episodes(subjectId, signal) {
      if (!subjectPattern.test(subjectId)) throw new Error('来源条目无效');
      return parseOmofunLines(
        await host.text(`${base}/anime/${subjectId}.html`, signal, headers),
        subjectId,
      );
    },
    async resolve(subjectId, lineId, episodeId, signal) {
      if (
        !subjectPattern.test(subjectId) ||
        !/^[1-9]\d*$/.test(lineId) ||
        !new RegExp(`^${lineId}-[1-9]\\d*$`).test(episodeId)
      )
        throw new Error('分集不属于当前来源');
      const nid = episodeId.split('-')[1]!;
      const pageUrl = `${base}/anime/${subjectId}/play/${lineId}/${nid}.html`;
      const html = await host.text(pageUrl, signal, headers);
      const { data, url } = playerData(html);
      if (
        data.id !== subjectId ||
        String(data.sid) !== lineId ||
        String(data.nid) !== nid ||
        !supportedPlayers.has(string(data.from))
      )
        throw new Error('播放数据与当前分集不一致');
      if (data.from !== 'mp4') {
        const media = checkedUrl(url);
        if (!/\.m3u8$/i.test(media.pathname)) throw new Error('此线路未返回 HLS 地址');
        return { url: media.href, mimeType: 'application/vnd.apple.mpegurl', headers };
      }
      if (!/^[a-f0-9]{32}$/.test(url)) throw new Error('精品资源编号无效');
      const dmid = html.match(/\bd4ddy\s*=\s*(\{[^\n]*?\})\s*;/)?.[1];
      const numericId = dmid ? string(record(JSON.parse(dmid) as unknown).dmid) : '';
      if (!/^[1-9]\d*$/.test(numericId)) throw new Error('精品来源条目编号无效');
      const vod = record(data.vod_data);
      const params = new URLSearchParams({
        url,
        dmid: numericId,
        next: string(data.link_next),
        name: string(vod.vod_name),
        nid,
        ph: 'https://as.cfhls.top/',
        h: base,
        pic: string(vod.vod_pic),
      });
      return parseOmofunPremium(
        await playerHost.text(`${omofunPlayerOrigin}/player/?${params}`, signal, {
          ...headers,
          Referer: pageUrl,
        }),
      );
    },
  };
}
