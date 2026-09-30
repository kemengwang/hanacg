import { animeRegionsFromLabels } from '@hanacg/domain';
import { createHash } from 'node:crypto';
export const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const count = (v: unknown) =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null;
export function date(v: unknown): string | null {
  const value = text(v);
  if (!/^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/.test(value)) return null;
  if (value.length === 10 && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)
    return null;
  return value;
}
export function normalizeSubject(raw: unknown) {
  const v = object(raw);
  if (!Number.isSafeInteger(v.id) || Number(v.id) <= 0 || !(text(v.name) || text(v.name_cn)))
    throw new Error('Invalid subject');
  const kind =
    v.type === 2
      ? 'anime'
      : v.type === 1 && v.platform === '小说'
        ? 'novel'
        : v.type === 1 && v.platform === '漫画'
          ? 'manga'
          : null;
  if (!kind || v.nsfw === true) return null;
  if (!Array.isArray(v.infobox)) throw new Error('Incomplete subject detail');
  const infobox = v.infobox;
  const values = (key: string) =>
    infobox.flatMap((item) => {
      const f = object(item);
      if (f.key !== key) return [];
      return typeof f.value === 'string'
        ? [f.value.trim()]
        : Array.isArray(f.value)
          ? f.value.map((x) => text(object(x).v)).filter(Boolean)
          : [];
    });
  const metaTags = Array.isArray(v.meta_tags) ? v.meta_tags.map(text).filter(Boolean) : [];
  const rating = object(v.rating);
  const score =
    typeof rating.score === 'number' &&
    Number.isFinite(rating.score) &&
    rating.score > 0 &&
    rating.score <= 10
      ? rating.score
      : null;
  const cover = text(object(v.images).large);
  const status =
    metaTags.includes('已完结') && !metaTags.includes('连载中')
      ? 'completed'
      : metaTags.includes('连载中') && !metaTags.includes('已完结')
        ? 'ongoing'
        : 'unknown';
  return {
    externalId: String(v.id),
    kind,
    name: text(v.name),
    nameCn: text(v.name_cn),
    summary: text(v.summary),
    format: text(v.platform),
    regions: animeRegionsFromLabels([
      ...metaTags,
      ...values('国家/地区'),
      ...values('制片国家/地区'),
      ...values('地区'),
      ...values('国家'),
    ]),
    series: kind === 'anime' ? null : typeof v.series === 'boolean' ? v.series : null,
    releaseDate: date(v.date),
    cover: /^https:\/\//.test(cover) ? cover : '',
    nsfw: false,
    episodeCount: count(v.eps),
    author: values('作者').join(' / '),
    infobox,
    releaseStatus: status,
    aliases: [...new Set([...values('别名'), text(v.name), text(v.name_cn)].filter(Boolean))],
    tags: [
      ...new Set([
        ...metaTags,
        ...(Array.isArray(v.tags) ? v.tags.map((x) => text(object(x).name)).filter(Boolean) : []),
      ]),
    ],
    metaTags,
    score,
    ratingCount: count(rating.total) ?? 0,
    rank: count(rating.rank),
    raw,
    hash: createHash('sha256').update('regions-v1:').update(JSON.stringify(raw)).digest('hex'),
  };
}
export type NormalSubject = NonNullable<ReturnType<typeof normalizeSubject>>;
export function normalizeEpisodes(raw: unknown) {
  if (!Array.isArray(raw)) throw new Error('Invalid episodes');
  return raw.map((item) => {
    const v = object(item);
    if (
      !Number.isSafeInteger(v.id) ||
      Number(v.id) <= 0 ||
      !Number.isInteger(v.type) ||
      Number(v.type) < 0 ||
      Number(v.type) > 6 ||
      typeof v.sort !== 'number' ||
      !Number.isFinite(v.sort)
    )
      throw new Error('Invalid episode');
    return {
      externalId: String(v.id),
      type: Number(v.type),
      sort: v.sort,
      number: typeof v.ep === 'number' && Number.isFinite(v.ep) ? v.ep : null,
      name: text(v.name),
      nameCn: text(v.name_cn),
      airDate: date(v.airdate),
      summary: text(v.desc),
    };
  });
}
export function normalizeCalendar(raw: unknown): { externalId: string; weekday: number }[] {
  if (!Array.isArray(raw)) throw new Error('Invalid calendar');
  return raw.flatMap((item) => {
    const day = object(item);
    const weekday = object(day.weekday).id;
    if (
      !Number.isInteger(weekday) ||
      Number(weekday) < 1 ||
      Number(weekday) > 7 ||
      !Array.isArray(day.items)
    )
      throw new Error('Invalid calendar day');
    return day.items.map((item) => {
      const v = object(item);
      if (!Number.isSafeInteger(v.id) || Number(v.id) <= 0)
        throw new Error('Invalid calendar subject');
      return { externalId: String(v.id), weekday: Number(weekday) };
    });
  });
}
