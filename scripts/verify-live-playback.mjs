// Explicit online smoke check. Run separately from deterministic CI tests.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(
    'http://127.0.0.1:5173/#/watch/400602?source=xifan&subject=26&line=hls&episode=329',
  );
  await page.locator('video').waitFor({ timeout: 60_000 });
  await page.locator('video').evaluate(async (video) => {
    video.muted = true;
    await video.play();
  });
  await page.waitForFunction(
    () => {
      const video = document.querySelector('video');
      return video && video.currentTime > 2 && video.videoWidth > 0;
    },
    null,
    { timeout: 45_000 },
  );
  const result = await page
    .locator('video')
    .evaluate((video) => ({
      currentTime: video.currentTime,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      paused: video.paused,
    }));
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/playback-live.png', fullPage: true });
  console.log(
    JSON.stringify({ source: '稀饭动漫', anime: '葬送的芙莉莲', episode: 1, ...result, errors }),
  );
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
