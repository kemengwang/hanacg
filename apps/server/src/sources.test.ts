import { describe, it, expect } from 'vitest';
import { parseAnime7Lines, parseAnime7Media, createAnime7, createTvt } from './sources';
import type { SourceHost } from './network';

describe('source adapters', () => {
  it('keeps episodes tied to their own line and ignores unrelated links', () => {
    const result = parseAnime7Lines(
      '<div class="hl-plays-from"><a>主线</a><a>备用</a></div><ul class="hl-plays-list"><li><a href="/vod-play/12-1-1/">第1集</a></li><a href="https://other.test">广告</a></ul><ul class="hl-plays-list"><a href="/vod-play/12-2-4/">第4集</a></ul>',
    );
    expect(result.map((l) => [l.id, l.name, l.episodes.map((e) => e.id)])).toEqual([
      ['1', '主线', ['12-1-1']],
      ['2', '备用', ['12-2-4']],
    ]);
  });
  it('decodes the source data without executing scripts', () => {
    const url = 'https://media.example/one/index.m3u8?key=abc';
    const data = { encrypt: 2, url: Buffer.from(encodeURIComponent(url)).toString('base64') };
    expect(parseAnime7Media(`<script>var player_aaaa=${JSON.stringify(data)}</script>`)).toEqual({
      url,
      mimeType: 'application/vnd.apple.mpegurl',
    });
    expect(() => parseAnime7Media('<script>var player_aaaa={url:runCode()}</script>')).toThrow();
    expect(() =>
      parseAnime7Media('<script>var player_aaaa={"url":"http://127.0.0.1/private.mp4"}</script>'),
    ).toThrow();
    expect(() =>
      parseAnime7Media('<script>var player_aaaa={"url":"https://site.test/player.html"}</script>'),
    ).toThrow();
  });
  it('ranks exact titles ahead of other seasons and rejects malformed search payloads', async () => {
    const host: SourceHost = {
      text: async () => '',
      json: async () => ({
        list: [
          { id: 2, name: '番剧 第二季' },
          { id: 1, name: '番剧' },
        ],
      }),
    };
    expect(
      (await createAnime7(host).search({ animeId: 10, title: '番剧', originalTitle: '' })).map(
        (m) => m.subjectId,
      ),
    ).toEqual(['1', '2']);
    host.json = async () => '<captcha>';
    await expect(
      createAnime7(host).search({ animeId: 10, title: '番剧', originalTitle: '' }),
    ).rejects.toThrow();
  });
  it('does not mix TvTFun line-specific episode IDs', async () => {
    const host: SourceHost = {
      text: async () => '',
      json: async () => ({
        data: {
          playSources: [
            { id: 'a', name: 'A', episodes: [{ id: 'a1', name: '第一集', sort: 0 }] },
            { id: 'b', name: 'B', episodes: [{ id: 'b3', name: '第三集', sort: 2 }] },
          ],
        },
      }),
    };
    const lines = await createTvt(host).episodes('subject');
    expect(lines.map((l) => l.episodes.map((e) => e.id))).toEqual([['a1'], ['b3']]);
  });
});
