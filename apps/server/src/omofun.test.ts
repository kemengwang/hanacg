import { createCipheriv } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  createOmofun,
  parseOmofunLines,
  parseOmofunPremium,
  parseOmofunSearch,
  OmofunSearchVerificationError,
  omofunPlayerOrigin,
} from './omofun';
import type { SourceHost } from './network';
import { buildServer } from './app';

const subject = '23b9ad4de769c3868cf4f0b3';
const base = 'https://www.omofuna.com';
const query = { animeId: 1, title: '测试番剧', originalTitle: '' };
const entries = [
  ['2', '天堂', 'dyttm3u8'],
  ['1', '精品', 'mp4'],
  ['3', '暴风', 'bfzym3u8'],
  ['4', '量子', 'lzm3u8'],
] as const;
const detail = `<h1>测试番剧</h1><ul class="channel-tab">${entries.map(([id, name]) => `<a href="#playlist${id}">${name}<span>2</span></a>`).join('')}</ul>${entries.map(([id]) => `<div id="playlist${id}"><ul class="play-list-content"><a href="/anime/${subject}/play/${id}/1.html">第01集</a><a href="/anime/${subject}/play/${id}/2.html">第02集</a><a href="/anime/${'a'.repeat(24)}/play/${id}/3.html">其他番剧</a><a href="/anime/${subject}/play/9/4.html">其他线路</a></ul></div>`).join('')}`;
function encryptedPlayer(url: string) {
  const iv = '00112233445566778899aabbccddeeff';
  const cipher = createCipheriv(
    'aes-128-cbc',
    Buffer.from('ABABEF777999CCCD'),
    Buffer.from(iv, 'hex'),
  );
  return `url: playData('${Buffer.concat([cipher.update(url), cipher.final()]).toString('base64')}', '${iv}')`;
}
function fixtureHost(): SourceHost {
  return {
    json: async () => ({}),
    text: vi.fn(async (url: string) => {
      if (url.includes('/player/?'))
        return encryptedPlayer('https://media.example/video?mime_type=video_mp4');
      const match = url.match(/\/play\/([1-4])\/([1-9]\d*)\.html$/);
      if (!match) return detail;
      const [, sid, nid] = match;
      return `<script>var d4ddy={"dmid":"17676"};</script><script>var player_aaaa=${JSON.stringify({ id: subject, sid: Number(sid), nid: Number(nid), from: entries.find(([id]) => id === sid)![2], encrypt: 1, url: encodeURIComponent(sid === '1' ? 'a'.repeat(32) : `https://media.example/${sid}/${nid}.m3u8`), vod_data: { vod_name: '测试番剧', vod_pic: '' } })}</script>`;
    }),
  };
}

describe('Omofun four-line adapter', () => {
  it('keeps the four advertised lines and rejects links belonging to other entries or lines', () => {
    expect(
      parseOmofunLines(detail, subject).map((l) => [l.name, l.episodes.map((e) => e.id)]),
    ).toEqual(entries.map(([id, name]) => [name, [`${id}-1`, `${id}-2`]]));
    expect(() => parseOmofunLines(detail, '../private')).toThrow();
  });
  it('distinguishes blocked search, empty results, malformed pages and title candidates', () => {
    expect(() => parseOmofunSearch('<title>系统安全验证</title>', query)).toThrow(
      OmofunSearchVerificationError,
    );
    expect(() => parseOmofunSearch('<html>unexpected</html>', query)).toThrow();
    expect(parseOmofunSearch('<title>搜索</title>没有找到', query)).toEqual([]);
    const html = `<h4><a href="/anime/${'a'.repeat(24)}.html">测试番剧第二季</a></h4><h4><a href="/anime/${subject}.html">测试番剧</a></h4><h4><a href="https://evil.example/anime/${subject}.html">外站</a></h4>`;
    expect(parseOmofunSearch(html, query).map((m) => m.matchedBy)).toEqual(['title', 'candidate']);
  });
  it('accepts only same-site links and restores a previously selected subject without keyword search', async () => {
    const host = fixtureHost();
    const adapter = createOmofun(host);
    expect(
      (await adapter.search({ ...query, title: `${base}/anime/${subject}/play/1/16.html` }))[0]
        ?.subjectId,
    ).toBe(subject);
    expect(
      (
        await adapter.search({ ...query, preferredSourceId: 'omofun', preferredSubjectId: subject })
      )[0]?.title,
    ).toBe('测试番剧');
    vi.mocked(host.text).mockClear();
    expect(await adapter.search({ ...query, title: 'https://other.example/anything' })).toEqual([]);
    await expect(adapter.search({ ...query, title: 'http://127.0.0.1/private' })).rejects.toThrow();
    await expect(
      adapter.search({ ...query, preferredSourceId: 'omofun', preferredSubjectId: '../private' }),
    ).rejects.toThrow();
    expect(host.text).not.toHaveBeenCalled();
  });
  it('resolves all four lines and refuses cross-line selections and mismatched upstream identities', async () => {
    const host = fixtureHost();
    const adapter = createOmofun(host);
    for (const [id] of entries)
      expect((await adapter.resolve(subject, id, `${id}-2`)).mimeType).toBe(
        id === '1' ? 'video/mp4' : 'application/vnd.apple.mpegurl',
      );
    expect(
      vi
        .mocked(host.text)
        .mock.calls.some(([url]) => url.startsWith(`${omofunPlayerOrigin}/player/?`)),
    ).toBe(true);
    await expect(adapter.resolve(subject, '2', '3-1')).rejects.toThrow();
    host.text = async () =>
      `<script>var player_aaaa={"id":"${subject}","sid":3,"nid":1,"from":"dyttm3u8","url":"https://media.example/a.m3u8"}</script>`;
    await expect(adapter.resolve(subject, '2', '2-1')).rejects.toThrow('不一致');
  });
  it('decodes public player data without evaluating code and rejects unsafe decoded URLs', () => {
    expect(parseOmofunPremium(encryptedPlayer('https://media.example/a.mp4')).url).toBe(
      'https://media.example/a.mp4',
    );
    for (const url of [
      'https://127.0.0.1/a.mp4',
      'https://media.example:8989/a.mp4',
      'https://media.example/player.html',
      'javascript:alert(1)',
    ])
      expect(() => parseOmofunPremium(encryptedPlayer(url))).toThrow();
    expect(() =>
      parseOmofunPremium('url: playData(runCode(), "00000000000000000000000000000000")'),
    ).toThrow();
  });
  it('exposes actionable search verification and issues media tickets only for valid listed episodes', async () => {
    const host = fixtureHost();
    const original = host.text;
    host.text = async (url, ...args) =>
      url.includes('/search/') ? '<title>系统安全验证</title>' : original(url, ...args);
    const app = buildServer([createOmofun(host)]);
    try {
      const failed = await app.inject('/api/playback/search?animeId=1&title=test');
      expect(failed.json().results[0].error).toContain('粘贴');
      const restored = await app.inject(
        `/api/playback/search?animeId=1&title=test&preferredSourceId=omofun&preferredSubjectId=${subject}`,
      );
      expect(restored.json().results[0].matches[0].subjectId).toBe(subject);
      for (const [id] of entries) {
        const result = await app.inject(
          `/api/playback/resolve?sourceId=omofun&subjectId=${subject}&lineId=${id}&episodeId=${id}-1`,
        );
        expect(result.statusCode).toBe(200);
        expect(result.json().resource.url).toMatch(/^\/api\/media\//);
        expect(result.body).not.toContain('media.example');
      }
      expect(
        (
          await app.inject(
            `/api/playback/resolve?sourceId=omofun&subjectId=${subject}&lineId=2&episodeId=2-999`,
          )
        ).statusCode,
      ).toBe(404);
    } finally {
      await app.close();
    }
  });
});
