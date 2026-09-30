import type { AnimeRegion, AnimeRegionFilter } from './regions';
export {
  animeRegions,
  isAnimeRegion,
  animeRegionsFromLabels,
  type AnimeRegion,
  type AnimeRegionFilter,
} from './regions';
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
  releaseStatus?: 'ongoing' | 'completed' | 'upcoming' | 'unknown';
  updatedEpisodes?: number;
  weekday?: number;
  regions?: AnimeRegion[];
}

export type DiscoveryTab = 'recommended' | 'calendar' | 'ranking';
export type ThemePreference = 'light' | 'dark' | 'system';
export interface DiscoveryQuery {
  keyword: string;
  genre: string;
  sort: 'recommended' | 'score' | 'year';
  year?: number;
  season?: number;
  yearBefore?: number;
  minScore?: number;
  region?: AnimeRegionFilter;
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
      (!query.region ||
        query.region === 'all' ||
        (query.region === 'unknown'
          ? !anime.regions?.length
          : anime.regions?.includes(query.region))) &&
      (query.genre === '全部' || anime.tags.includes(query.genre)) &&
      (!query.year || anime.year === query.year) &&
      (!query.yearBefore || (anime.year > 0 && anime.year < query.yearBefore)) &&
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

export function animeStatusLabel(anime: Anime): string {
  if (anime.releaseStatus === 'completed')
    return anime.episodes > 0 ? `已完结 · 全 ${anime.episodes} 话` : '已完结 · 总话数待补充';
  if (anime.releaseStatus === 'ongoing')
    return anime.updatedEpisodes && anime.updatedEpisodes > 0
      ? `连载中 · 更新至第 ${anime.updatedEpisodes} 话`
      : '连载中 · 进度待更新';
  if (anime.releaseStatus === 'upcoming') return '未开播';
  return '状态待更新';
}
