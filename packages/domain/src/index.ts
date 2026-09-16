/** Renderer-independent metadata. Video sources are deliberately separate. */
export interface Anime {
  id: number;
  title: string;
  originalTitle: string;
  summary: string;
  cover: string;
  score: number;
  year: number;
  episodes: number;
  tags: string[];
  airDate: string;
  weekday?: number;
}

export type DiscoveryTab = 'recommended' | 'calendar' | 'ranking';
export type ThemePreference = 'light' | 'dark' | 'system';
export interface DiscoveryQuery {
  keyword: string;
  genre: string;
  sort: 'recommended' | 'score' | 'year';
  year?: number;
  season?: number;
  minScore?: number;
}
export interface AnimeCardProps {
  anime: Anime;
  saved: boolean;
  onOpen: (anime: Anime) => void;
  onToggleSave: (anime: Anime) => void;
}

export function filterAnime(items: readonly Anime[], query: DiscoveryQuery): Anime[] {
  const keyword = query.keyword.trim().normalize('NFKC').toLocaleLowerCase();
  const results = items.filter(
    (anime) =>
      (!keyword ||
        [anime.title, anime.originalTitle, ...anime.tags]
          .join(' ')
          .normalize('NFKC')
          .toLocaleLowerCase()
          .includes(keyword)) &&
      (query.genre === '全部' || anime.tags.includes(query.genre)) &&
      (!query.year || anime.year === query.year) &&
      (!query.minScore || anime.score >= query.minScore) &&
      (!query.season ||
        (/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(anime.airDate) &&
          Math.ceil(Number(anime.airDate.slice(5, 7)) / 3) === query.season)),
  );
  if (query.sort === 'score') results.sort((a, b) => b.score - a.score);
  if (query.sort === 'year') results.sort((a, b) => b.year - a.year);
  return results;
}

export {
  filterBooks,
  type Book,
  type BookKind,
  type BookStatus,
  type BookQuery,
  type BookCardProps,
} from './books';
