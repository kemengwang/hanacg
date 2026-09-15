import { it, expect } from 'vitest';
import { buildServer } from './app';
import type { SourceAdapter } from '@hanacg/source-engine';
const source: SourceAdapter = {
  info: { id: 'test', name: '测试源', homepage: 'https://source.example' },
  search: async () => [],
  episodes: async () => [
    { id: 'line', name: '线路', episodes: [{ id: 'ep', number: 1, title: '第一集' }] },
  ],
  resolve: async () => ({
    url: 'https://cdn.example/video.m3u8',
    mimeType: 'application/vnd.apple.mpegurl',
    headers: { Cookie: 'server-only' },
  }),
};
it('validates query boundaries and prevents cross-source/cross-line resolution', async () => {
  const app = buildServer([source]);
  try {
    expect((await app.inject('/api/health')).statusCode).toBe(200);
    expect((await app.inject('/api/playback/search?title=abc')).statusCode).toBe(400);
    expect(
      (await app.inject('/api/playback/episodes?sourceId=missing&subjectId=s')).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject(
          '/api/playback/resolve?sourceId=test&subjectId=s&lineId=other&episodeId=ep',
        )
      ).statusCode,
    ).toBe(404);
    const response = await app.inject(
      '/api/playback/resolve?sourceId=test&subjectId=s&lineId=line&episodeId=ep',
    );
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.resource.url).toMatch(/^\/api\/media\/[\w-]+$/);
    expect(response.body).not.toContain('server-only');
    expect(response.body).not.toContain('cdn.example');
    expect((await app.inject('/api/media/unissued')).statusCode).toBe(410);
  } finally {
    await app.close();
  }
});
it('returns partial search success when one source fails', async () => {
  const app = buildServer([
    source,
    {
      ...source,
      info: { ...source.info, id: 'failed' },
      search: async () => {
        throw new Error('network');
      },
    },
  ]);
  try {
    const response = await app.inject('/api/playback/search?animeId=1&title=abc');
    expect(response.statusCode).toBe(200);
    expect(response.json().results[0].error).toBeUndefined();
    expect(response.json().results[1].error).toBeTruthy();
  } finally {
    await app.close();
  }
});
