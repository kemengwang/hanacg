import type { Book, BookKind } from '@hanacg/domain';
import type { NetworkClient } from '@hanacg/platform';

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const labels = { novel: '小说', manga: '漫画' } as const;

export function parseBook(value: unknown, kind: BookKind): Book | null {
  const data = record(value);
  const title = text(data.name_cn) || text(data.name);
  if (
    typeof data.id !== 'number' ||
    !Number.isSafeInteger(data.id) ||
    data.id <= 0 ||
    data.type !== 1 ||
    data.nsfw === true ||
    !title ||
    data.platform !== labels[kind]
  )
    return null;
  const metaTags = Array.isArray(data.meta_tags) ? data.meta_tags.map(text).filter(Boolean) : [];
  const tags = [
    ...new Set([
      ...metaTags,
      ...(Array.isArray(data.tags)
        ? data.tags.map((tag) => text(record(tag).name)).filter(Boolean)
        : []),
    ]),
  ];
  const images = record(data.images);
  const cover = text(images.large) || text(images.common);
  const score = record(data.rating).score;
  const infobox = Array.isArray(data.infobox) ? data.infobox.map(record) : [];
  const dates = [
    text(data.date),
    ...infobox.filter((field) => field.key === '发售日').map((field) => text(field.value)),
  ];
  const date = dates.find((value) =>
    /^[1-9]\d{3}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/.test(value),
  );
  const authors = Array.isArray(data.infobox)
    ? data.infobox.flatMap((entry) => {
        const field = record(entry);
        if (field.key !== '作者') return [];
        if (typeof field.value === 'string') return [field.value.trim()];
        return Array.isArray(field.value)
          ? field.value.map((author) => text(record(author).v)).filter(Boolean)
          : [];
      })
    : [];
  // Only public metadata determines status; chapter counts and user tags can be ambiguous.
  const statuses = metaTags.filter((tag) => tag === '连载中' || tag === '已完结');
  return {
    id: data.id,
    kind,
    title,
    originalTitle: text(data.name),
    cover: /^https:\/\//.test(cover) ? cover : '',
    score:
      typeof score === 'number' && Number.isFinite(score) ? Math.min(10, Math.max(0, score)) : 0,
    year: date ? Number(date.slice(0, 4)) : 0,
    tags,
    author: authors.filter(Boolean).join(' / '),
    status: statuses.length === 1 ? (statuses[0] as Book['status']) : 'unknown',
  };
}
export interface BookRepository {
  list(kind: BookKind, keyword: string, signal?: AbortSignal): Promise<Book[]>;
}
export function createBangumiBookRepository(
  network: NetworkClient,
  baseUrl = 'https://api.bgm.tv',
): BookRepository {
  const base = baseUrl.replace(/\/$/, '');
  if (!/^https:\/\//.test(base)) throw new Error('Bangumi endpoint must use HTTPS');
  return {
    async list(kind, keyword, signal) {
      const data = record(
        await (keyword.trim()
          ? network.json(`${base}/v0/search/subjects?limit=24&offset=0`, {
              method: 'POST',
              signal,
              body: {
                keyword: keyword.trim(),
                sort: 'match',
                filter: { type: [1], meta_tags: [labels[kind]], nsfw: false },
              },
            })
          : network.json(
              `${base}/v0/subjects?type=1&cat=${kind === 'novel' ? 1002 : 1001}&sort=rank&limit=24&offset=0`,
              { signal },
            )),
      );
      if (!Array.isArray(data.data)) throw new Error('书籍数据格式异常');
      const books = data.data
        .map((entry) => parseBook(entry, kind))
        .filter((book): book is Book => book !== null);
      return [...new Map(books.map((book) => [book.id, book])).values()];
    },
  };
}
