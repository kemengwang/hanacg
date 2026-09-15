import { useEffect, useRef, useState } from 'react';
import type { Anime } from '@hanacg/domain';
import type { MediaResource } from '@hanacg/platform';
import type {
  PlaybackRepository,
  SourceMatch,
  SourceLine,
  SourceSearchResult,
} from '@hanacg/source-engine';
export interface PlaybackSelection {
  sourceId: string;
  subjectId: string;
  lineId: string;
  episodeId: string;
}
export function usePlayback(
  repository: PlaybackRepository,
  anime: Anime,
  initial?: PlaybackSelection,
) {
  const [results, setResults] = useState<SourceSearchResult[]>([]);
  const [searching, setSearching] = useState(true);
  const [searchError, setSearchError] = useState('');
  const [searchVersion, setSearchVersion] = useState(0);
  const [query, setQuery] = useState(anime.title);
  const [match, setMatch] = useState<SourceMatch>();
  const [lines, setLines] = useState<SourceLine[]>([]);
  const [lineId, setLineId] = useState('');
  const [episodeId, setEpisodeId] = useState('');
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [episodeError, setEpisodeError] = useState('');
  const [episodeVersion, setEpisodeVersion] = useState(0);
  const [resource, setResource] = useState<MediaResource>();
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [resolveVersion, setResolveVersion] = useState(0);
  const initialRef = useRef(initial);
  const episodeAbort = useRef<AbortController | null>(null);
  const resolveAbort = useRef<AbortController | null>(null);
  const clearMedia = () => {
    resolveAbort.current?.abort();
    setResource(undefined);
    setResolveError('');
    setResolving(false);
  };
  const selectMatch = (next: SourceMatch) => {
    episodeAbort.current?.abort();
    clearMedia();
    setMatch(next);
    setLines([]);
    setLineId('');
    setEpisodeId('');
    setEpisodeError('');
    setLoadingEpisodes(true);
    setEpisodeVersion((v) => v + 1);
  };
  useEffect(() => {
    const controller = new AbortController();
    setSearching(true);
    setSearchError('');
    setResults([]);
    repository
      .search(
        { animeId: anime.id, title: query, originalTitle: anime.originalTitle },
        controller.signal,
      )
      .then((results) => {
        if (controller.signal.aborted) return;
        setResults(results);
        setSearching(false);
        const matches = results.flatMap((r) => r.matches);
        const preferred = initialRef.current;
        const selected =
          preferred &&
          matches.find(
            (m) => m.sourceId === preferred.sourceId && m.subjectId === preferred.subjectId,
          );
        // Keep the configured source priority among exact matches. Candidate-only
        // results always require an explicit user choice.
        const exact = matches.find((m) => m.matchedBy === 'metadata' || m.matchedBy === 'title');
        if (selected || exact) selectMatch((selected || exact)!);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSearching(false);
          setSearchError('未能连接播放服务，请确认服务已启动后重试。');
        }
      });
    return () => controller.abort();
  }, [repository, anime.id, anime.originalTitle, query, searchVersion]);
  useEffect(() => {
    if (!match) return;
    const controller = new AbortController();
    episodeAbort.current = controller;
    repository
      .episodes(match.sourceId, match.subjectId, controller.signal)
      .then((lines) => {
        if (controller.signal.aborted) return;
        setLines(lines);
        setLoadingEpisodes(false);
        const preferred = initialRef.current;
        const same =
          preferred?.sourceId === match.sourceId && preferred.subjectId === match.subjectId;
        const line =
          (same && lines.find((l) => l.id === preferred.lineId)) ||
          lines.find((l) => l.episodes.length) ||
          lines[0];
        setLineId(line?.id || '');
        // Restore a specifically chosen episode, otherwise wait for an explicit episode click.
        if (same && line?.episodes.some((e) => e.id === preferred.episodeId))
          setEpisodeId(preferred.episodeId);
        initialRef.current = undefined;
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadingEpisodes(false);
          setEpisodeError('未能加载此来源的分集，请重试或切换来源。');
        }
      });
    return () => controller.abort();
  }, [repository, match, episodeVersion]);
  useEffect(() => {
    if (!match || !lineId || !episodeId) return;
    const controller = new AbortController();
    resolveAbort.current = controller;
    setResolving(true);
    setResolveError('');
    setResource(undefined);
    repository
      .resolve(match.sourceId, match.subjectId, lineId, episodeId, controller.signal)
      .then((resource) => {
        if (!controller.signal.aborted) {
          setResource(resource);
          setResolving(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResolving(false);
          setResolveError('播放地址解析失败，请重试或切换来源。');
        }
      });
    return () => controller.abort();
  }, [repository, match, lineId, episodeId, resolveVersion]);
  const line = lines.find((l) => l.id === lineId);
  const episode = line?.episodes.find((e) => e.id === episodeId);
  return {
    results,
    searching,
    searchError,
    match,
    lines,
    line,
    episode,
    resource,
    resolving,
    resolveError,
    loadingEpisodes,
    episodeError,
    selectMatch,
    selectLine(id: string) {
      clearMedia();
      setLineId(id);
      setEpisodeId('');
    },
    selectEpisode(id: string) {
      if (!line?.episodes.some((e) => e.id === id)) return;
      clearMedia();
      setEpisodeId(id);
      setResolveVersion((v) => v + 1);
    },
    retryResolve() {
      clearMedia();
      setResolveVersion((v) => v + 1);
    },
    retryEpisodes() {
      if (match) selectMatch(match);
    },
    search(title = query) {
      episodeAbort.current?.abort();
      clearMedia();
      setMatch(undefined);
      setLines([]);
      setLineId('');
      setEpisodeId('');
      setQuery(title.trim() || anime.title);
      setSearchVersion((v) => v + 1);
    },
  };
}
