import { test, expect } from '@playwright/test';

const subjects = [
  {
    id: 801,
    type: 1,
    platform: '小说',
    name_cn: '山间来信',
    name: 'Letters',
    date: '2024-04-01',
    images: {},
    rating: { score: 8.7 },
    meta_tags: ['小说', '已完结'],
    tags: [{ name: '奇幻' }],
    infobox: [{ key: '作者', value: '作者甲' }],
  },
  {
    id: 802,
    type: 1,
    platform: '小说',
    name_cn: '雨后的书店',
    date: '2025-01-01',
    images: {},
    rating: { score: 7.4 },
    meta_tags: ['小说', '连载中'],
    tags: [{ name: '日常' }],
  },
];
test.beforeEach(async ({ page }) => {
  await page.route('https://api.bgm.tv/**', async (route) => {
    const request = route.request();
    const body = request.method() === 'POST' ? request.postDataJSON() : undefined;
    const manga = request.url().includes('cat=1001') || body?.filter.meta_tags?.includes('漫画');
    await route.fulfill({
      json: {
        data: subjects.map((item) =>
          manga
            ? {
                ...item,
                id: item.id + 100,
                platform: '漫画',
                name_cn: `${item.name_cn} 漫画`,
                meta_tags: ['漫画', '已完结'],
              }
            : item,
        ),
      },
    });
  });
});

test('book catalogs scope search, combine filters and restore URLs without opening playback', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '小说', exact: true }).click();
  await expect(page.getByRole('heading', { name: '小说', exact: true })).toBeVisible();
  await expect(page.locator('.book-card')).toHaveCount(2);
  await page
    .getByRole('group', { name: '题材' })
    .getByRole('button', { name: '奇幻', exact: true })
    .click();
  await page
    .getByRole('group', { name: '状态' })
    .getByRole('button', { name: '已完结', exact: true })
    .click();
  await page
    .getByRole('group', { name: '评分' })
    .getByRole('button', { name: '8 分及以上' })
    .click();
  await page
    .getByRole('group', { name: '年份' })
    .getByRole('button', { name: '2024', exact: true })
    .click();
  await expect(page.locator('.book-card-title')).toHaveText(['山间来信']);
  await page
    .getByRole('group', { name: '状态' })
    .getByRole('button', { name: '连载中', exact: true })
    .click();
  await expect(page.getByText('没有找到符合条件的小说')).toBeVisible();
  await page.getByRole('button', { name: '重置筛选' }).click();
  await expect(page.locator('.book-card')).toHaveCount(2);
  const request = page.waitForRequest((request) => request.method() === 'POST');
  await page.getByRole('textbox', { name: '搜索小说', exact: true }).fill('来信');
  expect((await request).postDataJSON().filter).toEqual({
    type: [1],
    meta_tags: ['小说'],
    nsfw: false,
  });
  await expect(page).toHaveURL(/#\/novel\?q=/);
  await page.reload();
  await expect(page.getByRole('textbox', { name: '搜索小说', exact: true })).toHaveValue('来信');
  await page.getByRole('button', { name: '漫画', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '搜索漫画', exact: true })).toHaveValue('');
  await expect(page.locator('.book-card-title')).toHaveText(['山间来信 漫画', '雨后的书店 漫画']);
  await expect(page.locator('.book-card button, .book-card a')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('textbox', { name: '搜索小说', exact: true })).toHaveValue('来信');
});

test('book failures recover, empty search clears and changing categories discards pending results', async ({
  page,
}) => {
  await page.route('https://api.bgm.tv/**', (route) => route.abort());
  await page.goto('/#/manga');
  await expect(page.getByText('漫画资料暂时未能加载')).toBeVisible();
  await expect(page.locator('.anime-card, .book-card')).toHaveCount(0);
  await page.unroute('https://api.bgm.tv/**');
  await page.route('https://api.bgm.tv/**', (route) => route.fulfill({ json: { data: [] } }));
  await page.getByRole('button', { name: '重新加载' }).click();
  await expect(page.getByText('没有找到符合条件的漫画')).toBeVisible();
  await page.getByRole('textbox', { name: '搜索漫画', exact: true }).fill('不存在');
  await expect(page.getByText('没有找到符合条件的漫画')).toBeVisible();
  await page.getByRole('button', { name: '清除搜索与筛选' }).click();
  await expect(page).toHaveURL(/#\/manga$/);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('https://api.bgm.tv/**', async (route) => {
    if (route.request().url().includes('cat=1002')) await pending;
    await route.fulfill({ json: { data: subjects } }).catch(() => {});
  });
  const novelRequest = page.waitForRequest('**/*cat=1002*');
  await page.getByRole('button', { name: '小说', exact: true }).click();
  await novelRequest;
  await page.getByRole('button', { name: '漫画', exact: true }).click();
  release();
  await expect(page.getByText('没有找到符合条件的漫画')).toBeVisible();
  await expect(page.locator('.book-card')).toHaveCount(0);
});

test('book catalogs support light, dark and narrow layouts with accessible navigation', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/#/novel');
  await expect(page.locator('.book-card')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/books-light.png' });
  await page.getByRole('button', { name: '切换到暗色模式' }).click();
  await page.screenshot({ path: 'test-results/books-dark.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.book-card')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/books-mobile-dark.png' });
  await page.getByRole('button', { name: '切换到亮色模式' }).click();
  await page.screenshot({ path: 'test-results/books-mobile-light.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '展开导航栏' }).click();
  await page.getByRole('button', { name: '漫画', exact: true }).click();
  await expect(page.getByRole('heading', { name: '漫画', exact: true })).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveClass(/is-collapsed/);
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('textbox', { name: '搜索漫画', exact: true })).toBeFocused();
});
