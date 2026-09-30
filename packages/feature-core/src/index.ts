import { useCallback, useEffect, useState } from 'react';
import type { Anime, DiscoveryTab, AnimeRegionFilter } from '@hanacg/domain';
import { curatedAnime, parseAnime, record, type DiscoveryRepository } from '@hanacg/api-client';
import type { KeyValueStorage } from '@hanacg/platform';

export function useDiscovery(
  repository: DiscoveryRepository,
  tab: DiscoveryTab,
  keyword: string,
  refresh: number,
  region: AnimeRegionFilter = 'all',
) {
  const [state, setState] = useState<{ items: readonly Anime[]; loading: boolean; error: boolean }>(
    { items: curatedAnime, loading: false, error: false },
  );
  useEffect(() => {
    const controller = new AbortController();
    if (tab === 'recommended' && !keyword.trim()) {
      setState({ items: curatedAnime, loading: false, error: false });
      return () => controller.abort();
    }
    setState({ items: [], loading: true, error: false });
    const timer = setTimeout(
      () => {
        const request = keyword.trim()
          ? repository.search(keyword, controller.signal, region)
          : tab === 'calendar'
            ? repository.calendar(controller.signal)
            : repository.ranking(controller.signal, region);
        request
          .then((items) => {
            if (!controller.signal.aborted) setState({ items, loading: false, error: false });
          })
          .catch(() => {
            if (!controller.signal.aborted)
              setState({
                items: tab === 'calendar' && !keyword.trim() ? [] : curatedAnime,
                loading: false,
                error: true,
              });
          });
      },
      keyword.trim() ? 350 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [repository, tab, keyword, refresh, region]);
  return state;
}

export function readSaved(storage: KeyValueStorage): Anime[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem('hana:saved:v1') ?? '[]');
    if (!Array.isArray(parsed)) return [];
    // Reuse metadata validation; local artwork paths are limited to bundled files.
    return [
      ...new Map(
        parsed.flatMap((value) => {
          const item = record(value);
          const anime = parseAnime({
            id: item.id,
            name_cn: item.title,
            name: item.originalTitle,
            summary: item.summary,
            type: 2,
            date: item.airDate,
            eps: item.episodes,
            regions: item.regions,
            images: { large: item.cover },
            rating: { score: item.score },
            tags: Array.isArray(item.tags) ? item.tags.map((name) => ({ name })) : [],
          });
          if (!anime) return [];
          if (['ongoing', 'completed', 'upcoming', 'unknown'].includes(String(item.releaseStatus)))
            anime.releaseStatus = item.releaseStatus as Anime['releaseStatus'];
          if (
            typeof item.updatedEpisodes === 'number' &&
            Number.isFinite(item.updatedEpisodes) &&
            item.updatedEpisodes > 0
          )
            anime.updatedEpisodes = item.updatedEpisodes;
          if (typeof item.cover === 'string' && /^\/artwork\/[a-z-]+\.jpg$/.test(item.cover))
            anime.cover = item.cover;
          return [[anime.id, anime] as const];
        }),
      ).values(),
    ];
  } catch {
    return [];
  }
}

export function useSavedAnime(storage: KeyValueStorage) {
  const [saved, setSaved] = useState(() => readSaved(storage));
  const [persistent, setPersistent] = useState(true);
  const toggle = useCallback((anime: Anime) => {
    setSaved((current) =>
      current.some((entry) => entry.id === anime.id)
        ? current.filter((entry) => entry.id !== anime.id)
        : [anime, ...current],
    );
  }, []);
  useEffect(() => {
    setPersistent(storage.setItem('hana:saved:v1', JSON.stringify(saved)));
  }, [saved, storage]);
  return { saved, toggle, persistent };
}

export { usePlayback, type PlaybackSelection } from './playback';
export { useWatchHistory, readHistory, type WatchEntry } from './history';

export { useBooks } from './books';
