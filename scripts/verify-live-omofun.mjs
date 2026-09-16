// Explicit online source/media smoke check; no watch history or user data is written.
// Run: HANA_FAKE_IP_DNS=1 pnpm --filter @hanacg/server exec tsx ../../scripts/verify-live-omofun.mjs
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createOmofun, omofunPlayerOrigin } from '../apps/server/src/omofun.ts';
import { buildServer } from '../apps/server/src/app.ts';
import { sourceHost, createSourceHost, closeNetwork } from '../apps/server/src/network.ts';

const link =
  process.env.OMOFUN_URL || 'https://www.omofuna.com/anime/23b9ad4de769c3868cf4f0b3/play/1/16.html';
const episodeNumber = Number(process.env.OMOFUN_EPISODE || 16);
const adapter = createOmofun(sourceHost, createSourceHost([omofunPlayerOrigin]));
const server = buildServer([adapter]);
server.get('/live-check', async (_, reply) =>
  reply
    .type('text/html')
    .send(
      '<!doctype html><title>Omofun live check</title><video muted controls></video><script src="/hls.js"></script>',
    ),
);
server.get('/hls.js', async (_, reply) =>
  reply
    .type('application/javascript')
    .send(
      await readFile(new URL('../apps/web/node_modules/hls.js/dist/hls.min.js', import.meta.url)),
    ),
);
let browser;
try {
  const [match] = await adapter.search({ animeId: 0, title: link, originalTitle: '' });
  if (!match) throw new Error('No source entry found');
  const lines = await adapter.episodes(match.subjectId);
  const address = await server.listen({ host: '127.0.0.1', port: 0 });
  browser = await chromium.launch({ channel: 'chrome' });
  const results = [];
  for (const line of lines) {
    const episode = line.episodes.find((item) => item.number === episodeNumber);
    if (!episode) continue;
    const page = await browser.newPage();
    let stage = 'resolve';
    const failures = [];
    page.on('response', (response) => {
      if (response.url().includes('/api/media/') && response.status() >= 400)
        failures.push(response.status());
    });
    try {
      await page.goto(`${address}/live-check`);
      const params = new URLSearchParams({
        sourceId: 'omofun',
        subjectId: match.subjectId,
        lineId: line.id,
        episodeId: episode.id,
      });
      const response = await page.request.get(`${address}/api/playback/resolve?${params}`, {
        timeout: 35000,
      });
      if (!response.ok()) throw new Error(`resolve HTTP ${response.status()}`);
      const { resource } = await response.json();
      stage = 'play';
      await page.evaluate(
        ({ resource }) => {
          const video = document.querySelector('video');
          window.hlsError = '';
          if (resource.mimeType.includes('mpegurl')) {
            const hls = new Hls({ maxBufferLength: 5, maxMaxBufferLength: 10 });
            hls.on(Hls.Events.ERROR, (_, data) => {
              if (data.fatal) window.hlsError = data.details;
            });
            hls.loadSource(resource.url);
            hls.attachMedia(video);
          } else video.src = resource.url;
          video.play().catch(() => {});
        },
        { resource },
      );
      await page.waitForFunction(
        () => {
          const video = document.querySelector('video');
          return (video.currentTime > 2 && video.videoWidth > 0) || video.error || window.hlsError;
        },
        null,
        { timeout: 35000 },
      );
      const result = await page.locator('video').evaluate((video) => ({
        currentTime: video.currentTime,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        error: video.error?.message || window.hlsError,
      }));
      results.push({ line: line.name, episode: episode.number, ...result, failures });
      if (result.error || result.currentTime <= 2 || !result.width) process.exitCode = 1;
    } catch (error) {
      results.push({ line: line.name, stage, error: error.message, failures });
      process.exitCode = 1;
    } finally {
      await page.close();
    }
    console.log(JSON.stringify(results.at(-1)));
  }
  console.log(JSON.stringify({ title: match.title, subjectId: match.subjectId, results }, null, 2));
} finally {
  await browser?.close();
  await server.close();
  await closeNetwork();
}
