import { animeFixture } from './catalog-fixtures';
import { test, expect } from '@playwright/test';

const subject = {
  id: 500,
  type: 2,
  name_cn: '测试番剧',
  name: 'Test anime',
  date: '2026-07-01',
  eps: 12,
  images: {},
  rating: { score: 8 },
  tags: [{ name: '奇幻' }],
};
test.beforeEach(async ({ page }) => {
  await page.route('**/api/announcements', (r) => r.fulfill({ json: { items: [] } }));
  await page.route('**/api/playback/search?**', (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  await page.route('**/api/catalog/**', (route) =>
    route.fulfill({ json: { items: [animeFixture(subject)] } }),
  );
  await page.route('**/api/catalog/calendar', (r) =>
    r.fulfill({
      json: { items: [{ ...animeFixture(subject), weekday: 1, cover: '/artwork/frieren.jpg' }] },
    }),
  );
});

test('discovery, filters, playback navigation, saved items and persistence', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '全站公告' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '新番时间表' })).toBeVisible();
  await expect(page.locator('.hero, .feed-tabs')).toHaveCount(0);
  await page.getByRole('button', { name: /周一/ }).click();
  await page.getByRole('button', { name: '播放测试番剧', exact: true }).click();
  await expect(page).toHaveURL(/#\/watch\/500/);
  await page.getByRole('button', { name: '加入追番', exact: true }).click();
  await page.getByRole('button', { name: '我的追番', exact: true }).click();
  await expect(page.locator('.anime-card')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: '我的追番', exact: true }).click();
  await expect(page.locator('.anime-card')).toHaveCount(1);
  await page.getByRole('button', { name: '取消追番：测试番剧', exact: true }).click();
  await expect(page.getByText('为喜欢的故事留个位置')).toBeVisible();
});

test('theme and sidebar persist, theme can follow OS changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('button', { name: '切换到暗色模式' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.topbar').getByRole('button', { name: '收起导航栏', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.sidebar')).toHaveClass(/is-collapsed/);
  await page.getByRole('button', { name: '外观与偏好', exact: true }).click();
  await page.getByRole('button', { name: '跟随系统' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('online search renders metadata, clears, and handles empty results', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: '搜索番剧', exact: true });
  await input.fill('测试');
  await expect(page).toHaveURL(/#\/anime\?q=/);
  await expect(page.getByRole('heading', { name: '番剧', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '番剧', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('.card-title')).toHaveText(['测试番剧']);
  await page.route('**/api/catalog/**', (route) => route.fulfill({ json: { items: [] } }));
  await input.fill('没有这部番');
  await expect(page.getByText('还没有找到这部番剧')).toBeVisible();
  await page.getByRole('button', { name: '清空搜索' }).click();
  await expect(page).toHaveURL(/#\/anime$/);
  await expect(page.getByRole('group', { name: '风格' })).toBeVisible();
});

test('calendar changes weekdays and never fabricates an offline schedule', async ({ page }) => {
  await page.route('**/api/catalog/calendar', (route) =>
    route.fulfill({ json: { items: [{ ...animeFixture(subject), weekday: 1 }] } }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: /周一/ }).click();
  await expect(page.locator('.card-title')).toHaveText(['测试番剧']);
  await page.getByRole('button', { name: /周二/ }).click();
  await expect(page.getByText('这一天暂时没有放送记录')).toBeVisible();
  await page.route('**/api/catalog/calendar', (route) => route.abort());
  await page.reload();
  await expect(page.getByText('新番时间表暂时无法加载')).toBeVisible();
  await expect(page.locator('.anime-card')).toHaveCount(0);
});

test('failed online search falls back to a clearly labeled local subset', async ({ page }) => {
  await page.route('**/api/catalog/**', (route) => route.abort());
  await page.goto('/');
  await page.getByRole('textbox', { name: '搜索番剧', exact: true }).fill('芙莉莲');
  await expect(page.getByText('暂时无法连接资料库，以下为本地精选中的结果。')).toBeVisible();
  await expect(page.locator('.anime-card')).toHaveCount(1);
});

test('late search responses do not replace newer results', async ({ page }) => {
  let completeFirst: (() => void) | undefined;
  await page.route('**/api/catalog/**', async (route) => {
    const keyword = new URL(route.request().url()).searchParams.get('q') ?? '';
    if (keyword === '旧搜索')
      await new Promise<void>((resolve) => {
        completeFirst = resolve;
      });
    await route
      .fulfill({ json: { items: [animeFixture({ ...subject, name_cn: keyword })] } })
      .catch(() => {});
  });
  await page.goto('/');
  const input = page.getByRole('textbox', { name: '搜索番剧', exact: true });
  await input.fill('旧搜索');
  await expect.poll(() => Boolean(completeFirst)).toBe(true);
  await input.fill('新搜索');
  await expect(page.locator('.card-title')).toHaveText(['新搜索']);
  completeFirst?.();
  await expect(page.locator('.card-title')).toHaveText(['新搜索']);
});

test('mobile drawer, dialog keyboard behavior and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await page.getByRole('button', { name: '展开导航栏', exact: true }).last().click();
  await page.getByRole('button', { name: '我的追番', exact: true }).click();
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await page.getByRole('button', { name: '浏览番剧' }).click();
  await page.getByRole('button', { name: '播放测试番剧', exact: true }).click();
  await expect(page.getByRole('heading', { name: '测试番剧', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '返回发现' }).click();
  await page.getByRole('button', { name: '展开导航栏', exact: true }).last().click();
  await page.getByRole('button', { name: '外观与偏好', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.topbar').getByRole('button', { name: '收起导航栏', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/discovery-mobile.png', fullPage: true });
});

test('captures light and dark desktop, bundled artwork loads', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('button', { name: /周一/ }).click();
  await expect(page.locator('.anime-card img')).toHaveCount(1);
  await expect
    .poll(() =>
      page
        .locator('.hero-art, .anime-card img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.screenshot({ path: 'test-results/discovery-light.png', fullPage: true });
  await page.getByRole('button', { name: '切换到暗色模式' }).click();
  await page.screenshot({ path: 'test-results/discovery-dark.png', fullPage: true });
});

test('catalog combines filters, resets, and opens playable details', async ({ page }) => {
  await page.route('**/api/catalog/**', (route) =>
    route.fulfill({
      json: {
        items: [
          subject,
          {
            ...subject,
            id: 501,
            name_cn: '春日故事',
            date: '2025-04-01',
            rating: { score: 9 },
            tags: [{ name: '日常' }],
          },
          { ...subject, id: 502, name_cn: '夏日奇幻', rating: { score: 7 } },
        ].map(animeFixture),
      },
    }),
  );
  await page.goto('/');
  await expect(page.locator('.sidebar .brand, .sidebar input, .sidebar-search')).toHaveCount(0);
  await page.getByRole('button', { name: '番剧', exact: true }).click();
  await expect(page.locator('.anime-card')).toHaveCount(3);
  await page
    .getByRole('group', { name: '风格' })
    .getByRole('button', { name: '奇幻', exact: true })
    .click();
  await page.getByRole('button', { name: '2026', exact: true }).click();
  await page.getByRole('button', { name: '7–9 月', exact: true }).click();
  await page.getByRole('button', { name: '8 分及以上', exact: true }).click();
  await expect(page.locator('.card-title')).toHaveText(['测试番剧']);
  await page.getByRole('button', { name: '9 分及以上', exact: true }).click();
  await expect(page.getByText('还没有找到这部番剧')).toBeVisible();
  await page.getByRole('button', { name: '重置筛选', exact: true }).click();
  await page.getByRole('button', { name: '最高评分', exact: true }).click();
  await expect(page.locator('.card-title')).toHaveText(['春日故事', '测试番剧', '夏日奇幻']);
  await page.locator('.card-title').first().click();
  await expect(page).toHaveURL(/#\/watch\/501/);
  await expect(page.getByRole('heading', { name: '春日故事', exact: true })).toBeVisible();
});

test('global search works from the library, survives reload and supports browser back', async ({
  page,
}) => {
  await page.goto('/#/saved');
  const input = page.getByRole('textbox', { name: '搜索番剧', exact: true });
  await expect(input).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(input).toBeFocused();
  await input.fill('测试');
  await expect(page.locator('.card-title')).toHaveText(['测试番剧']);
  await page.reload();
  await expect(input).toHaveValue('测试');
  await expect(page.locator('.card-title')).toHaveText(['测试番剧']);
  await page.goBack();
  await expect(page).toHaveURL(/#\/saved$/);
  await expect(page.getByRole('heading', { name: '我的追番', exact: true })).toBeVisible();
});

test('catalog topbar stays visible, light and dark layouts fit desktop and mobile', async ({
  page,
}) => {
  await page.route('**/api/catalog/**', (route) => route.abort());
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/#/anime');
  await expect(page.locator('.anime-card')).toHaveCount(11);
  await page.screenshot({ path: 'test-results/catalog-light.png' });
  const before = await page.locator('.topbar').boundingBox();
  await page.locator('.main-scroll').evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(
    await page.locator('.main-scroll').evaluate((element) => element.scrollTop),
  ).toBeGreaterThan(0);
  expect(await page.locator('.topbar').boundingBox()).toEqual(before);
  await expect(page.getByRole('textbox', { name: '搜索番剧', exact: true })).toBeVisible();
  await page.locator('.main-scroll').evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.getByRole('button', { name: '切换到暗色模式' }).click();
  await page.screenshot({ path: 'test-results/catalog-dark.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await expect(page.locator('.anime-card')).toHaveCount(11);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(
    await page
      .locator('.main-scroll')
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await expect(page.getByRole('button', { name: '全部评分', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/catalog-mobile-dark.png' });
  await page.getByRole('button', { name: '切换到亮色模式' }).click();
  await page.screenshot({ path: 'test-results/catalog-mobile-light.png' });
});

test('legacy saved IDs migrate with a backup and remain saved on the new catalog', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'hana:saved:v1',
      JSON.stringify([
        {
          id: 500,
          title: '测试番剧',
          originalTitle: 'Test anime',
          summary: '',
          cover: '',
          score: 8,
          year: 2026,
          airDate: '2026-07-01',
          episodes: 12,
          tags: ['奇幻'],
        },
      ]),
    );
  });
  await page.route('**/api/catalog/resolve-ids', (r) =>
    r.fulfill({ json: { ids: { 500: 1000000050 } } }),
  );
  await page.route('**/api/catalog/subjects?**', (r) =>
    r.fulfill({ json: { items: [{ ...animeFixture(subject), id: 1000000050 }] } }),
  );
  await page.goto('/#/anime');
  await expect(page.getByRole('button', { name: '取消追番：测试番剧' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hana:saved:v1')!)[0].id)).toBe(
    1000000050,
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('hana:saved:v1:before-catalog')!)[0].id,
    ),
  ).toBe(500);
});

test('region filters query the catalog, combine with style and reset across layouts', async ({
  page,
}) => {
  const entries = [
    { ...animeFixture(subject), id: 601, title: '日漫样本', regions: ['japan'] },
    { ...animeFixture(subject), id: 602, title: '国漫样本', regions: ['china'], tags: ['日常'] },
    { ...animeFixture(subject), id: 603, title: '欧美样本', regions: ['western'] },
    { ...animeFixture(subject), id: 604, title: '未知地区', regions: [] },
  ];
  await page.route('**/api/catalog/subjects?**', (r) => {
    const region = new URL(r.request().url()).searchParams.get('region');
    return r.fulfill({
      json: {
        items: entries.filter(
          (a) => !region || (region === 'unknown' ? !a.regions.length : a.regions.includes(region)),
        ),
      },
    });
  });
  await page.goto('/#/anime');
  const years = page.getByRole('group', { name: '年份', exact: true }).getByRole('button');
  const yearLabels = await years.allTextContents();
  const regions = page.getByRole('group', { name: '地区', exact: true });
  await regions.getByRole('button', { name: '国漫', exact: true }).click();
  await expect(page.locator('.card-title')).toHaveText(['国漫样本']);
  await expect(years).toHaveText(yearLabels);
  await page
    .getByRole('group', { name: '风格' })
    .getByRole('button', { name: '奇幻', exact: true })
    .click();
  await expect(page.getByText('还没有找到这部番剧')).toBeVisible();
  await page.getByRole('button', { name: '重置筛选', exact: true }).click();
  await expect(page.locator('.anime-card')).toHaveCount(4);
  await regions.getByRole('button', { name: '日漫', exact: true }).click();
  await expect(page.locator('.card-title')).toHaveText(['日漫样本']);
  await page.screenshot({ path: 'test-results/regions-light.png' });
  await page.getByRole('button', { name: '切换到暗色模式' }).click();
  await page.screenshot({ path: 'test-results/regions-dark.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.topbar').getByRole('button', { name: '收起导航栏', exact: true }).click();
  await regions.getByRole('button', { name: '未标注', exact: true }).click();
  await expect(page.locator('.card-title')).toHaveText(['未知地区']);
  expect(
    await page.locator('.main-scroll').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/regions-mobile.png' });
});

test('card status and delayed tooltip only for truncated titles', async ({ page }) => {
  const longTitle = '这是一部长标题番剧用于验证超出隐藏时才展示完整标题的行为';
  await page.route('**/api/catalog/subjects?**', (r) =>
    r.fulfill({
      json: {
        items: [
          { ...animeFixture(subject), title: longTitle, releaseStatus: 'completed' },
          {
            ...animeFixture(subject),
            id: 501,
            title: '短标题',
            releaseStatus: 'ongoing',
            updatedEpisodes: 5,
          },
          { ...animeFixture(subject), id: 502, title: '未知进度', releaseStatus: 'ongoing' },
        ],
      },
    }),
  );
  await page.goto('/#/anime');
  await expect(page.locator('.card-meta')).toHaveText([
    '已完结 · 全 12 话',
    '连载中 · 更新至第 5 话',
    '连载中 · 进度待更新',
  ]);
  await page.clock.install();
  await page.getByRole('button', { name: '短标题', exact: true }).hover();
  await page.clock.runFor(2100);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await page.getByRole('button', { name: longTitle, exact: true }).hover();
  await page.clock.runFor(1900);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await page.clock.runFor(200);
  await expect(page.getByRole('tooltip')).toHaveText(longTitle);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(page.locator('.card-meta[title], .card-title[title]')).toHaveCount(0);
});

test('announcement retry renders configured content on narrow discovery page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/announcements', (r) => r.abort());
  await page.goto('/');
  await expect(page.getByText('公告暂时无法加载。')).toBeVisible();
  await page.route('**/api/announcements', (r) =>
    r.fulfill({ json: { items: [{ id: '1', title: '站内通知', content: '本周公告内容。' }] } }),
  );
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.getByRole('heading', { name: '站内通知' })).toBeVisible();
  await page.getByRole('button', { name: /周一/ }).click();
  await expect(page.locator('.anime-card')).toHaveCount(1);
  expect(
    await page.locator('.main-scroll').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/discovery-mobile-content.png', fullPage: true });
});
