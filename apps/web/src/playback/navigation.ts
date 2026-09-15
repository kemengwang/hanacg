import { useEffect, useState } from 'react';
import type { PlaybackSelection } from '@hanacg/feature-core';
export function readRoute() {
  const path = window.location.hash.slice(1).split('?')[0] || '/';
  const match = path.match(/^\/watch\/([1-9]\d*)$/);
  return {
    page: match
      ? 'watch'
      : path === '/saved'
        ? 'saved'
        : path === '/history'
          ? 'history'
          : 'discover',
    animeId: match ? Number(match[1]) : undefined,
  } as const;
}
export function useNavigation() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return {
    route,
    go(path: string) {
      window.location.hash = path;
      setRoute(readRoute());
    },
  };
}
export function readSelection(): PlaybackSelection | undefined {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const sourceId = params.get('source'),
    subjectId = params.get('subject'),
    lineId = params.get('line'),
    episodeId = params.get('episode');
  return sourceId && subjectId
    ? { sourceId, subjectId, lineId: lineId || '', episodeId: episodeId || '' }
    : undefined;
}
export function writeSelection(selection: PlaybackSelection) {
  const params = new URLSearchParams({
    source: selection.sourceId,
    subject: selection.subjectId,
    line: selection.lineId,
    episode: selection.episodeId,
  });
  if (!selection.lineId) params.delete('line');
  if (!selection.episodeId) params.delete('episode');
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}${window.location.hash.split('?')[0]}?${params}`,
  );
}
