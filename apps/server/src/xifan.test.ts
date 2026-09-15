import { it, expect } from 'vitest';
import { parseXifanLines, createXifan } from './xifan';
import type { SourceHost } from './network';
it('reads serialized public data without running scripts and exposes only supported HLS', () => {
  const props = {
    sources: [
      { code: 'xfy2', episodes: [{ id: 329, episode_number: 1, title: '冒险结束' }] },
      { code: 'CS', episodes: [{ id: 999, episode_number: 99 }] },
    ],
  };
  const payload = `1e:${JSON.stringify(['$', 'component', null, props])}\n`;
  const html = `<script>self.__next_f.push(${JSON.stringify([1, payload])})</script><script>throw Error('must not execute')</script>`;
  expect(parseXifanLines(html)).toEqual([
    {
      id: 'hls',
      name: '默认 HLS',
      episodes: [{ id: '329', number: 1, title: '第 1 集 · 冒险结束' }],
    },
  ]);
  expect(() => parseXifanLines('<html>verification</html>')).toThrow();
});
it('rejects a resolver response for a different anime or a fallback source', async () => {
  const host: SourceHost = {
    text: async () => '',
    json: async () => null,
    post: async () => ({
      ok: true,
      anime_id: 27,
      episode_id: 329,
      resolved_action: 'hls',
      url: 'https://cdn.example/a.m3u8',
    }),
  };
  await expect(createXifan(host).resolve('26', 'hls', '329')).rejects.toThrow();
  host.post = async () => ({
    ok: true,
    anime_id: 26,
    episode_id: 329,
    resolved_action: 'fallback',
    url: 'https://cdn.example/a.mp4',
  });
  await expect(createXifan(host).resolve('26', 'hls', '329')).rejects.toThrow();
});
