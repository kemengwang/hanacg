import { test, expect, type Page } from '@playwright/test';
const title = '葬送的芙莉莲';
const sources = [
  {
    source: { id: 'anime7', name: 'Anime7', homepage: 'https://anime7.top' },
    matches: [
      {
        sourceId: 'anime7',
        subjectId: '2645',
        title,
        url: 'https://anime7.top/vod-detail/2645/',
        matchedBy: 'title',
      },
    ],
  },
  {
    source: { id: 'tvtfun', name: 'TvTFun', homepage: 'https://www.tvtfun.net' },
    matches: [
      {
        sourceId: 'tvtfun',
        subjectId: 's2',
        title,
        url: 'https://www.tvtfun.net/video/400602',
        matchedBy: 'title',
      },
    ],
  },
];
async function mock(page: Page) {
  await page.route('**/api/playback/search?**', (r) => r.fulfill({ json: { results: sources } }));
  await page.route('**/api/playback/episodes?**', (r) => {
    const second = new URL(r.request().url()).searchParams.get('sourceId') === 'tvtfun';
    return r.fulfill({
      json: {
        lines: second
          ? [
              {
                id: 'b',
                name: '线路B',
                episodes: [{ id: 'b-special', title: '特别篇', number: 1 }],
              },
            ]
          : [
              {
                id: 'a',
                name: '线路A',
                episodes: Array.from({ length: 28 }, (_, i) => ({
                  id: `a${i + 1}`,
                  title: `第${String(i + 1).padStart(2, '0')}集`,
                  number: i + 1,
                })),
              },
              {
                id: 'c',
                name: '线路C',
                episodes: [{ id: 'c2', title: '第02集（备用）', number: 2 }],
              },
            ],
      },
    });
  });
  await page.route('**/api/playback/resolve?**', (r) =>
    r.fulfill({ json: { resource: { url: '/api/media/test-video', mimeType: 'video/webm' } } }),
  );
  // A real browser-generated WebM exercises decoding/playback without a remote video dependency.
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext('2d')!;
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
    recorder.start();
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = i % 2 ? '#283d35' : '#365047';
      ctx.fillRect(0, 0, 320, 180);
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px sans-serif';
      ctx.fillText('Hana playback test', 50, 92);
      await new Promise((r) => setTimeout(r, 100));
    }
    recorder.stop();
    await done;
    stream.getTracks().forEach((t) => t.stop());
    return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()));
  });
  await page.route('**/api/media/test-video', (r) =>
    r.fulfill({ body: Buffer.from(bytes), contentType: 'video/webm' }),
  );
}
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await mock(page);
});
test('clicking anime navigates to player; each source and line owns its episodes', async ({
  page,
}) => {
  await page.getByRole('button', { name: '查看番剧', exact: true }).click();
  await expect(page).toHaveURL(/#\/watch\/400602/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: '跳到主要内容' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/watch\/400602/);
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.locator('.episode-grid button')).toHaveCount(28);
  await page.getByRole('button', { name: '第01集', exact: true }).click();
  await expect(page.locator('video')).toBeVisible();
  await page.locator('video').evaluate((v: HTMLVideoElement) => {
    v.muted = true;
    return v.play();
  });
  await expect
    .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: '下一集', exact: true }).click();
  await expect(page).toHaveURL(/episode=a2/);
  await page.getByRole('button', { name: '线路C', exact: true }).click();
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.locator('.episode-grid button')).toHaveText(['第02集（备用）']);
  await page
    .locator('.source-group')
    .filter({ has: page.getByRole('link', { name: 'TvTFun' }) })
    .getByRole('button')
    .click();
  await expect(page.locator('.episode-grid button')).toHaveText(['特别篇']);
  await expect(page.locator('video')).toHaveCount(0);
  await page.getByRole('button', { name: '观看历史', exact: true }).click();
  await expect(page.locator('.history-entry')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.history-entry')).toHaveCount(1);
});
test('opening a page is not history, and source/episode selection survives refresh', async ({
  page,
}) => {
  await page.goto('/#/watch/400602?source=anime7&subject=2645&line=a&episode=a2');
  await expect(page.getByRole('button', { name: '第02集', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('video')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '第02集', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '观看历史', exact: true }).click();
  await expect(page.getByText('故事，还没开始')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
});
test('source search, empty episodes, resolve errors and retry are actionable', async ({ page }) => {
  await page.route('**/api/playback/search?**', (r) => r.abort());
  await page.goto('/#/watch/400602');
  await expect(page.getByText('未能连接播放服务，请确认服务已启动后重试。')).toBeVisible();
  await page.route('**/api/playback/search?**', (r) => r.fulfill({ json: { results: sources } }));
  await page.getByRole('button', { name: '重试来源搜索' }).click();
  await expect(page.locator('.episode-grid button')).toHaveCount(28);
  await page.route('**/api/playback/resolve?**', (r) =>
    r.fulfill({ status: 502, json: { error: 'offline' } }),
  );
  await page.getByRole('button', { name: '第01集', exact: true }).click();
  await expect(page.getByText('播放地址解析失败，请重试或切换来源。')).toBeVisible();
  await page.route('**/api/playback/resolve?**', (r) =>
    r.fulfill({ json: { resource: { url: '/api/media/test-video', mimeType: 'video/webm' } } }),
  );
  await page.locator('.watch-placeholder').getByRole('button', { name: '重新解析' }).click();
  await expect(page.locator('video')).toBeVisible();
  await page.route('**/api/playback/episodes?**', (r) => r.fulfill({ json: { lines: [] } }));
  await page.locator('.source-group').last().getByRole('button').click();
  await expect(page.getByText('此来源暂无分集，请选择其他来源。')).toBeVisible();
});
test('late source episode and media responses cannot replace a newer selection', async ({
  page,
}) => {
  let release: (() => void) | undefined;
  await page.route('**/api/playback/episodes?**', async (r) => {
    if (new URL(r.request().url()).searchParams.get('sourceId') === 'anime7')
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    await r
      .fulfill({
        json: {
          lines: [
            { id: 'b', name: '线路B', episodes: [{ id: 'b1', title: '独立分集', number: 1 }] },
          ],
        },
      })
      .catch(() => {});
  });
  await page.goto('/#/watch/400602');
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.locator('.source-group').last().getByRole('button').click();
  await expect(page.getByRole('button', { name: '独立分集' })).toBeVisible();
  release?.();
  await page.getByRole('button', { name: '独立分集' }).click();
  await expect(page).toHaveURL(/source=tvtfun/);
});
test('playback renders in light, dark and narrow viewports with keyboard focus', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/#/watch/400602');
  await expect(page.locator('.episode-grid button')).toHaveCount(28);
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeFocused();
  await page.screenshot({ path: 'test-results/playback-light.png', fullPage: true });
  await page.getByRole('button', { name: '切换到暗色模式' }).click();
  await page.screenshot({ path: 'test-results/playback-dark.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.episode-grid button')).toHaveCount(28);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/playback-mobile.png', fullPage: true });
  await page.getByRole('heading', { name: '选集', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/playback-mobile-episodes.png', fullPage: true });
});

test('late media resolution cannot restore a video after switching sources', async ({ page }) => {
  let release: (() => void) | undefined;
  await page.route('**/api/playback/resolve?**', async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route
      .fulfill({ json: { resource: { url: '/api/media/test-video', mimeType: 'video/webm' } } })
      .catch(() => {});
  });
  await page.goto('/#/watch/400602');
  await page.getByRole('button', { name: '第01集', exact: true }).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.locator('.source-group').last().getByRole('button').click();
  await expect(page.getByRole('button', { name: '特别篇' })).toBeVisible();
  release?.();
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page).not.toHaveURL(/episode=a1/);
});
