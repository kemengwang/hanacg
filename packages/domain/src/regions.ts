export const animeRegions = ['japan', 'china', 'western', 'korea', 'other'] as const;
export type AnimeRegion = (typeof animeRegions)[number];
export type AnimeRegionFilter = AnimeRegion | 'all' | 'unknown';
export function isAnimeRegion(value: unknown): value is AnimeRegion {
  return typeof value === 'string' && (animeRegions as readonly string[]).includes(value);
}
/** Only explicit country/region metadata is classified; never infer from title or language. */
export function animeRegionsFromLabels(labels: readonly string[]): AnimeRegion[] {
  const groups: Record<AnimeRegion, readonly string[]> = {
    japan: ['日本', '日漫', '日本动画'],
    china: [
      '中国',
      '中国大陆',
      '中国香港',
      '中国台湾',
      '中国澳门',
      '大陆',
      '香港',
      '台湾',
      '国漫',
      '国产',
      '国产动画',
    ],
    western: [
      '欧美',
      '欧美动画',
      '美国',
      '加拿大',
      '英国',
      '法国',
      '德国',
      '意大利',
      '西班牙',
      '葡萄牙',
      '俄罗斯',
      '苏联',
      '荷兰',
      '比利时',
      '瑞典',
      '挪威',
      '丹麦',
      '芬兰',
      '冰岛',
      '爱尔兰',
      '瑞士',
      '奥地利',
      '波兰',
      '捷克',
      '捷克斯洛伐克',
      '匈牙利',
      '罗马尼亚',
      '保加利亚',
      '乌克兰',
      '希腊',
    ],
    korea: ['韩国', '韩漫', '韩国动画'],
    other: [
      '其他',
      '澳大利亚',
      '新西兰',
      '印度',
      '泰国',
      '越南',
      '马来西亚',
      '新加坡',
      '印度尼西亚',
      '菲律宾',
      '巴西',
      '墨西哥',
      '阿根廷',
      '南非',
      '伊朗',
      '以色列',
      '土耳其',
    ],
  };
  const tokens = new Set(labels.flatMap((label) => label.split(/[/、,，;；|\s]+/)).filter(Boolean));
  return animeRegions.filter((region) => groups[region].some((label) => tokens.has(label)));
}
