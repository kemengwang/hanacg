import type { Anime } from '@hanacg/domain';
import type { MediaResource } from '@hanacg/platform';

/** Contract only: executing source rules belongs to a later playback milestone. */
export interface SourceMatch {
  sourceId: string;
  subjectId: string;
  title: string;
  url: string;
}
export interface Episode {
  id: string;
  title: string;
  number: number;
}
export interface SourceAdapter {
  readonly id: string;
  readonly name: string;
  search(anime: Anime, signal?: AbortSignal): Promise<SourceMatch[]>;
  episodes(match: SourceMatch, signal?: AbortSignal): Promise<Episode[]>;
  resolve(episode: Episode, signal?: AbortSignal): Promise<MediaResource>;
}
