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
  await page.route('**/api/playback/search?**', (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  await page.route('https://api.bgm.tv/**', (route) =>
    route.fulfill({ json: { data: [subject] } }),
  );
});

test('discovery, filters, playback navigation, saved items and persistence', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '今天，看点什么？' })).toBeVisible();
  await expect(page.locator('.anime-card')).toHaveCount(6);
  await page.getByRole('button', { name: '治愈', exact: true }).click();
  await expect(page.locator('.anime-card')).toHaveCount(4);
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await page.getByRole('button', { name: '查看番剧', exact: true }).click();
  await expect(page).toHaveURL(/#\/watch\/400602/);
  await page.getByRole('button', { name: '加入追番', exact: true }).click();
  await page.getByRole('button', { name: '我的追番', exact: true }).click();
  await expect(page.locator('.anime-card')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: '我的追番', exact: true }).click();
  await expect(page.locator('.anime-card')).toHaveCount(1);
  await page.getByRole('button', { name: '取消追番：葬送的芙莉莲', exact: true }).click();
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
  await page.route('https://api.bgm.tv/**', (route) => route.fulfill({ json: { data: [] } }));
  await input.fill('没有这部番');
  await expect(page.getByText('还没有找到这部番剧')).toBeVisible();
  await page.getByRole('button', { name: '清空搜索' }).click();
  await expect(page).toHaveURL(/#\/anime$/);
  await expect(page.getByRole('group', { name: '风格' })).toBeVisible();
});

test('calendar changes weekdays and never fabricates an offline schedule', async ({ page }) => {
  await page.route('https://api.bgm.tv/calendar', (route) =>
    route.fulfill({ json: [{ weekday: { id: 1 }, items: [subject] }] }),
  );
  await page.goto('/');
  await page.getByRole('tab', { name: '每日放送' }).click();
  await page.getByRole('button', { name: /周一/ }).click();
  await expect(page.locator('.card-title')).toHaveText(['测试番剧']);
  await page.getByRole('button', { name: /周二/ }).click();
  await expect(page.getByText('这一天暂时没有放送记录')).toBeVisible();
  await page.route('https://api.bgm.tv/calendar', (route) => route.abort());
  await page.getByRole('tab', { name: '为你推荐' }).click();
  await page.getByRole('tab', { name: '每日放送' }).click();
  await expect(page.getByText('暂时无法获取在线放送表，请稍后重试。')).toBeVisible();
  await expect(page.locator('.anime-card')).toHaveCount(0);
});

test('failed online search falls back to a clearly labeled local subset', async ({ page }) => {
  await page.route('https://api.bgm.tv/**', (route) => route.abort());
  await page.goto('/');
  await page.getByRole('textbox', { name: '搜索番剧', exact: true }).fill('芙莉莲');
  await expect(page.getByText('暂时无法连接 Bangumi，以下为本地精选中的结果。')).toBeVisible();
  await expect(page.locator('.anime-card')).toHaveCount(1);
});

test('late search responses do not replace newer results', async ({ page }) => {
  let completeFirst: (() => void) | undefined;
  await page.route('https://api.bgm.tv/**', async (route) => {
    const keyword = (route.request().postDataJSON() as { keyword: string }).keyword;
    if (keyword === '旧搜索')
      await new Promise<void>((resolve) => {
        completeFirst = resolve;
      });
    await route.fulfill({ json: { data: [{ ...subject, name_cn: keyword }] } }).catch(() => {});
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
  await page.getByRole('button', { name: '浏览精选番剧' }).click();
  await page.getByRole('button', { name: '查看番剧', exact: true }).click();
  await expect(page.getByRole('heading', { name: '葬送的芙莉莲', exact: true })).toBeVisible();
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
  await page.route('https://api.bgm.tv/**', (route) =>
    route.fulfill({
      json: {
        data: [
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
        ],
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
  await page.keyboard.press('Control+k');
  const input = page.getByRole('textbox', { name: '搜索番剧', exact: true });
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
  await page.route('https://api.bgm.tv/**', (route) => route.abort());
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
