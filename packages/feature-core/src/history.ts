import { useCallback, useRef, useState } from 'react';
import type { Anime } from '@hanacg/domain';
import type { KeyValueStorage } from '@hanacg/platform';
import { parseStoredAnime, record } from '@hanacg/api-client';
import type { PlaybackSelection } from './playback';
export interface WatchEntry extends PlaybackSelection {
  anime: Anime;
  episodeTitle: string;
  position: number;
  duration: number;
  updatedAt: number;
}
const key = 'hana:history:v1';
export function readHistory(storage: KeyValueStorage): WatchEntry[] {
  try {
    const data = record(JSON.parse(storage.getItem(key) || '{}') as unknown);
    if (data.version !== 1 || !Array.isArray(data.entries)) return [];
    const entries = data.entries.flatMap((v) => {
      const e = record(v);
      const anime = parseStoredAnime(e.anime);
      if (
        !anime ||
        !['sourceId', 'subjectId', 'lineId', 'episodeId', 'episodeTitle'].every(
          (k) => typeof e[k] === 'string' && e[k],
        ) ||
        !['position', 'duration', 'updatedAt'].every(
          (k) => typeof e[k] === 'number' && Number.isFinite(e[k]) && Number(e[k]) >= 0,
        )
      )
        return [];
      return [
        {
          anime,
          sourceId: String(e.sourceId),
          subjectId: String(e.subjectId),
          lineId: String(e.lineId),
          episodeId: String(e.episodeId),
          episodeTitle: String(e.episodeTitle),
          position: Number(e.position),
          duration: Number(e.duration),
          updatedAt: Number(e.updatedAt),
        },
      ];
    });
    const unique = new Map<number, WatchEntry>();
    for (const entry of entries.sort((a, b) => b.updatedAt - a.updatedAt))
      if (!unique.has(entry.anime.id)) unique.set(entry.anime.id, entry);
    return [...unique.values()].slice(0, 100);
  } catch {
    return [];
  }
}
export function useWatchHistory(storage: KeyValueStorage) {
  const [history, setHistory] = useState(() => readHistory(storage));
  const [persistent, setPersistent] = useState(true);
  const current = useRef(history);
  const save = useCallback(
    (entry: WatchEntry) => {
      if (
        !Number.isFinite(entry.position) ||
        !Number.isFinite(entry.duration) ||
        entry.position <= 0
      )
        return;
      const next = [entry, ...current.current.filter((e) => e.anime.id !== entry.anime.id)].slice(
        0,
        100,
      );
      current.current = next;
      // Flush synchronously on pagehide; a queued React effect may not run before unloading.
      setPersistent(storage.setItem(key, JSON.stringify({ version: 1, entries: next })));
      setHistory(next);
    },
    [storage],
  );
  return { history, save, persistent };
}
