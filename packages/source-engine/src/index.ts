import type { MediaResource } from '@hanacg/platform';

export interface SourceInfo {
  id: string;
  name: string;
  homepage: string;
}
/** Metadata IDs never double as a source's subject/episode IDs. */
export interface SourceMatch {
  sourceId: string;
  subjectId: string;
  title: string;
  url: string;
  matchedBy: 'metadata' | 'title' | 'candidate';
}
export interface Episode {
  id: string;
  title: string;
  number: number;
}
export interface SourceLine {
  id: string;
  name: string;
  episodes: Episode[];
}
export interface SourceSearchResult {
  source: SourceInfo;
  matches: SourceMatch[];
  error?: string;
}
export interface SourceQuery {
  animeId: number;
  title: string;
  originalTitle: string;
}
export interface SourceAdapter {
  readonly info: SourceInfo;
  search(query: SourceQuery, signal?: AbortSignal): Promise<SourceMatch[]>;
  episodes(subjectId: string, signal?: AbortSignal): Promise<SourceLine[]>;
  resolve(
    subjectId: string,
    lineId: string,
    episodeId: string,
    signal?: AbortSignal,
  ): Promise<MediaResource>;
}
export interface PlaybackRepository {
  search(query: SourceQuery, signal?: AbortSignal): Promise<SourceSearchResult[]>;
  episodes(sourceId: string, subjectId: string, signal?: AbortSignal): Promise<SourceLine[]>;
  resolve(
    sourceId: string,
    subjectId: string,
    lineId: string,
    episodeId: string,
    signal?: AbortSignal,
  ): Promise<MediaResource>;
}
const normalizeTitle = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '');
export function matchTitle(
  title: string,
  query: SourceQuery,
  metadataId?: number,
): SourceMatch['matchedBy'] {
  if (metadataId !== undefined) return metadataId === query.animeId ? 'metadata' : 'candidate';
  return [query.title, query.originalTitle]
    .filter(Boolean)
    .some((t) => normalizeTitle(t) === normalizeTitle(title))
    ? 'title'
    : 'candidate';
}
export function rankMatches(matches: SourceMatch[]): SourceMatch[] {
  const rank = { metadata: 0, title: 1, candidate: 2 };
  return [...matches].sort((a, b) => rank[a.matchedBy] - rank[b.matchedBy]);
}
