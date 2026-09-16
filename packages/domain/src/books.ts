/** Book metadata stays separate from playable anime and viewing history. */
export type BookKind = 'novel' | 'manga';
export type BookStatus = '连载中' | '已完结' | 'unknown';
export interface Book {
  id: number;
  kind: BookKind;
  title: string;
  originalTitle: string;
  cover: string;
  score: number;
  year: number;
  tags: string[];
  author: string;
  status: BookStatus;
}
export interface BookQuery {
  genre: string;
  year: number;
  status: BookStatus | 'all';
  minScore: number;
  sort: 'recommended' | 'score' | 'year';
}
export interface BookCardProps {
  book: Book;
}
export function filterBooks(items: readonly Book[], query: BookQuery): Book[] {
  const results = items.filter(
    (book) =>
      (query.genre === '全部' || book.tags.includes(query.genre)) &&
      (!query.year || book.year === query.year) &&
      (query.status === 'all' || book.status === query.status) &&
      (!query.minScore || book.score >= query.minScore),
  );
  if (query.sort === 'score') results.sort((a, b) => b.score - a.score);
  if (query.sort === 'year') results.sort((a, b) => b.year - a.year);
  return results;
}
