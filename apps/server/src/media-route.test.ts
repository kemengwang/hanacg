import { afterEach, it, expect, vi } from 'vitest';
import { Readable } from 'node:stream';
import * as network from './network';
import { buildServer } from './app';
import type { SourceAdapter } from '@hanacg/source-engine';
const source: SourceAdapter = {
  info: { id: 'test', name: '测试', homepage: 'https://source.example' },
  search: async () => [],
  episodes: async () => [{ id: 'line', name: 'A', episodes: [{ id: '1', number: 1, title: '1' }] }],
  resolve: async () => ({
    url: 'https://cdn.example/master.m3u8',
    mimeType: 'application/vnd.apple.mpegurl',
  }),
};
afterEach(() => vi.restoreAllMocks());
it('proxies nested HLS and Range responses without exposing upstream URLs', async () => {
  const fetch = vi.spyOn(network, 'upstream').mockImplementation(async (url, _signal, headers) => {
    if (url.endsWith('master.m3u8'))
      return {
        url,
        statusCode: 200,
        headers: { 'content-type': 'application/vnd.apple.mpegurl' },
        body: Readable.from(['#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\nlow.m3u8']),
      };
    if (url.endsWith('low.m3u8'))
      return {
        url,
        statusCode: 200,
        headers: { 'content-type': 'application/vnd.apple.mpegurl' },
        body: Readable.from(['#EXTM3U\n#EXTINF:6,\npart.ts']),
      };
    expect(headers?.Range).toBe('bytes=0-3');
    return {
      url,
      statusCode: 206,
      headers: {
        'content-type': 'video/mp2t',
        'content-range': 'bytes 0-3/10',
        'content-length': '4',
      },
      body: Readable.from([Buffer.from('test')]),
    };
  });
  const app = buildServer([source]);
  try {
    const resolved = (
      await app.inject('/api/playback/resolve?sourceId=test&subjectId=s&lineId=line&episodeId=1')
    ).json();
    const master = await app.inject(resolved.resource.url);
    expect(master.statusCode).toBe(200);
    expect(master.body).not.toContain('cdn.example');
    const variant = await app.inject(master.body.split('\n').at(-1)!);
    const segment = await app.inject({
      url: variant.body.split('\n').at(-1)!,
      headers: { range: 'bytes=0-3' },
    });
    expect(segment.statusCode).toBe(206);
    expect(segment.headers['content-range']).toBe('bytes 0-3/10');
    expect(segment.body).toBe('test');
    expect(fetch).toHaveBeenCalledTimes(3);
  } finally {
    await app.close();
  }
});
