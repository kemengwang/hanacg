export function animeFixture(v: {
  id: number;
  name_cn: string;
  name: string;
  date: string;
  eps: number;
  rating: { score: number };
  tags: { name: string }[];
}) {
  return {
    id: v.id,
    title: v.name_cn,
    originalTitle: v.name,
    summary: '',
    cover: '',
    score: v.rating.score,
    year: Number(v.date.slice(0, 4)),
    airDate: v.date,
    episodes: v.eps,
    tags: v.tags.map((t) => t.name),
  };
}
export function bookFixture(v: {
  id: number;
  name_cn: string;
  name?: string;
  date: string;
  platform: string;
  rating: { score: number };
  tags: { name: string }[];
  meta_tags: string[];
  infobox?: { key: string; value: string }[];
}) {
  return {
    id: v.id,
    kind: v.platform === '漫画' ? 'manga' : 'novel',
    title: v.name_cn,
    originalTitle: v.name ?? '',
    cover: '',
    score: v.rating.score,
    year: Number(v.date.slice(0, 4)),
    tags: v.tags.map((t) => t.name),
    author: v.infobox?.find((x) => x.key === '作者')?.value ?? '',
    status: v.meta_tags.includes('已完结') ? '已完结' : '连载中',
  };
}
