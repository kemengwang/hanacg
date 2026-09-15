import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Film,
  Play,
  Plus,
  RefreshCw,
  Search,
  SkipForward,
} from 'lucide-react';
import type { Anime } from '@hanacg/domain';
import { createPlaybackRepository, curatedAnime } from '@hanacg/api-client';
import { usePlayback, type WatchEntry } from '@hanacg/feature-core';
import { Button, Poster } from '@hanacg/ui';
import { browserNetwork } from '../platform';
import { VideoPlayer } from './VideoPlayer';
import { readSelection, writeSelection } from './navigation';
import './playback.css';
const repository = createPlaybackRepository(browserNetwork);
interface Props {
  animeId: number;
  seed?: Anime;
  saved: boolean;
  onSave: (anime: Anime) => void;
  onBack: () => void;
  history?: WatchEntry;
  onProgress: (entry: WatchEntry) => void;
  persistent: boolean;
}
export function PlaybackPage(props: Props) {
  const [anime, setAnime] = useState<Anime | undefined>(
    () => props.seed || curatedAnime.find((a) => a.id === props.animeId),
  );
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (anime) return;
    const controller = new AbortController();
    setError('');
    repository
      .anime(props.animeId, controller.signal)
      .then((a) => {
        if (!controller.signal.aborted) setAnime(a);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('未能加载番剧资料，请重试。');
      });
    return () => controller.abort();
  }, [props.animeId, anime, retry]);
  if (!anime)
    return (
      <div className="playback-loading" role="status">
        <Film size={32} />
        <p>{error || '正在加载番剧资料…'}</p>
        {error && <Button onClick={() => setRetry((v) => v + 1)}>重新加载</Button>}
        <Button onClick={props.onBack}>返回发现</Button>
      </div>
    );
  return <WatchContent {...props} anime={anime} />;
}
function WatchContent({
  anime,
  saved,
  onSave,
  onBack,
  history,
  onProgress,
  persistent,
}: Props & { anime: Anime }) {
  const [initial] = useState(() => readSelection() || history);
  const playback = usePlayback(repository, anime, initial);
  const [keyword, setKeyword] = useState(anime.title);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    document.title = `${anime.title} · Hana ACG`;
  }, [anime.title]);
  const { match, line, episode, resource } = playback;
  useEffect(() => {
    if (match && !playback.loadingEpisodes)
      writeSelection({
        sourceId: match.sourceId,
        subjectId: match.subjectId,
        lineId: line?.id || '',
        episodeId: episode?.id || '',
      });
  }, [match, line, episode, playback.loadingEpisodes]);
  const source = playback.results.find((r) => r.source.id === match?.sourceId)?.source;
  const nextEpisode =
    episode && line?.episodes[line.episodes.findIndex((e) => e.id === episode.id) + 1];
  // Freeze the resume point per player load; progress updates must not reload the media.
  const [resumeEntry] = useState(history);
  const resume =
    resumeEntry &&
    match?.sourceId === resumeEntry.sourceId &&
    match.subjectId === resumeEntry.subjectId &&
    line?.id === resumeEntry.lineId &&
    episode?.id === resumeEntry.episodeId
      ? resumeEntry.position
      : 0;
  let placeholder = '选择分集，开始观看';
  if (playback.searching) placeholder = '正在匹配播放来源…';
  else if (playback.loadingEpisodes) placeholder = '正在加载此来源的分集…';
  else if (playback.resolving) placeholder = '正在解析播放地址…';
  else if (!match) placeholder = '选择匹配的番剧来源';
  return (
    <article className="watch-page">
      <button className="watch-back" onClick={onBack}>
        <ArrowLeft size={15} />
        返回发现
      </button>
      <header className="watch-heading">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            {anime.title}
          </h1>
          <p>
            {episode
              ? `${source?.name} / ${line?.name} / ${episode.title}`
              : '选一个来源，继续这个故事。'}
          </p>
        </div>
        <Button onClick={() => onSave(anime)} aria-pressed={saved}>
          {saved ? <Check size={15} /> : <Plus size={15} />} {saved ? '已加入追番' : '加入追番'}
        </Button>
      </header>
      <div className="watch-layout">
        <div className="watch-main">
          <section className="watch-screen" aria-label="播放器">
            {resource && episode && match && line ? (
              <VideoPlayer
                key={`${match.sourceId}:${match.subjectId}:${line.id}:${episode.id}`}
                resource={resource}
                title={`${anime.title} ${episode.title}`}
                resume={resume}
                onRetry={playback.retryResolve}
                onProgress={(position, duration) =>
                  onProgress({
                    anime,
                    sourceId: match.sourceId,
                    subjectId: match.subjectId,
                    lineId: line.id,
                    episodeId: episode.id,
                    episodeTitle: episode.title,
                    position,
                    duration,
                    updatedAt: Date.now(),
                  })
                }
              />
            ) : (
              <div className="watch-placeholder" role="status">
                <span className="watch-play-mark">
                  <Play size={26} />
                </span>
                <h2>{playback.resolveError || placeholder}</h2>
                <p>
                  {playback.resolveError
                    ? '也可以在右侧选择其他来源或线路。'
                    : '每个来源的分集独立提供，播放前可核对标题。'}
                </p>
                {playback.resolveError && (
                  <button onClick={playback.retryResolve}>
                    <RefreshCw size={14} />
                    重新解析
                  </button>
                )}
              </div>
            )}
          </section>
          <div className="watch-controls">
            <span>{episode ? episode.title : '尚未选择分集'}</span>
            <div>
              <button disabled={!episode} onClick={playback.retryResolve}>
                <RefreshCw size={14} />
                重新解析
              </button>
              <button
                disabled={!nextEpisode}
                onClick={() => nextEpisode && playback.selectEpisode(nextEpisode.id)}
              >
                下一集
                <SkipForward size={15} />
              </button>
            </div>
          </div>
          {!persistent && (
            <p className="data-notice" role="status">
              无法保存到此设备，观看记录仅在本次会话保留。
            </p>
          )}
          <section className="watch-about">
            <Poster anime={anime} />
            <div>
              <h2>关于这个故事</h2>
              <p className="watch-meta">
                {anime.year || '年份待定'}{' '}
                <span>★ {anime.score ? anime.score.toFixed(1) : '暂无评分'}</span>
                <span>{anime.tags.slice(0, 3).join(' / ')}</span>
              </p>
              <p className="watch-original">{anime.originalTitle}</p>
              <details>
                <summary>番剧简介</summary>
                <p>{anime.summary || '暂无简介。'}</p>
              </details>
              <a href={`https://bgm.tv/subject/${anime.id}`} target="_blank" rel="noreferrer">
                Bangumi 资料
                <ArrowUpRight size={12} />
              </a>
            </div>
          </section>
        </div>
        <aside className="watch-picker" aria-label="来源与分集">
          <section className="watch-sources">
            <div className="watch-section-title">
              <h2>播放来源</h2>
              <button
                className="icon-button"
                aria-label="刷新来源"
                onClick={() => playback.search()}
              >
                <RefreshCw size={15} />
              </button>
            </div>
            <form
              className="source-search"
              onSubmit={(e) => {
                e.preventDefault();
                playback.search(keyword);
              }}
            >
              <input
                aria-label="来源搜索关键词"
                value={keyword}
                maxLength={120}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <button aria-label="搜索来源" type="submit">
                <Search size={15} />
              </button>
            </form>
            {playback.searching && (
              <p className="picker-notice" role="status">
                正在搜索来源…
              </p>
            )}
            {playback.searchError && (
              <div className="picker-notice" role="alert">
                <p>{playback.searchError}</p>
                <button onClick={() => playback.search()}>重试来源搜索</button>
              </div>
            )}
            {playback.results.map((result) => (
              <div className="source-group" key={result.source.id}>
                <h3>
                  <a href={result.source.homepage} target="_blank" rel="noreferrer">
                    {result.source.name}
                    <ArrowUpRight size={11} />
                  </a>
                  <span>{result.error ? '暂不可用' : `${result.matches.length} 个结果`}</span>
                </h3>
                {result.error ? (
                  <p className="picker-notice">{result.error}</p>
                ) : !result.matches.length ? (
                  <p className="picker-notice">未找到匹配，可修改关键词搜索。</p>
                ) : (
                  result.matches.map((item) => (
                    <button
                      className={`source-option ${match?.sourceId === item.sourceId && match.subjectId === item.subjectId ? 'active' : ''}`}
                      key={item.subjectId}
                      aria-pressed={
                        match?.sourceId === item.sourceId && match.subjectId === item.subjectId
                      }
                      onClick={() => playback.selectMatch(item)}
                    >
                      <span>{item.title}</span>
                      <small>
                        {item.matchedBy === 'candidate'
                          ? '候选'
                          : item.matchedBy === 'metadata'
                            ? '资料匹配'
                            : '同名'}
                      </small>
                    </button>
                  ))
                )}
              </div>
            ))}
          </section>
          <section className="watch-episodes">
            <div className="watch-section-title">
              <h2>选集</h2>
              <span>{line ? `${line.episodes.length} 集` : ''}</span>
            </div>
            {match && (
              <p className="selected-source">
                {source?.name} / {match.title}
              </p>
            )}
            {playback.loadingEpisodes ? (
              <p role="status" className="picker-notice">
                正在加载分集…
              </p>
            ) : playback.episodeError ? (
              <div className="picker-notice" role="alert">
                <p>{playback.episodeError}</p>
                <button onClick={playback.retryEpisodes}>重试分集</button>
              </div>
            ) : !match ? (
              <p className="picker-notice">先选择上方的番剧来源。</p>
            ) : !playback.lines.length ? (
              <p className="picker-notice">此来源暂无分集，请选择其他来源。</p>
            ) : (
              <>
                <div className="source-lines" aria-label="播放线路">
                  {playback.lines.map((l) => (
                    <button
                      key={l.id}
                      aria-pressed={line?.id === l.id}
                      onClick={() => playback.selectLine(l.id)}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
                {!line?.episodes.length ? (
                  <p className="picker-notice">此线路暂无分集，请选择其他线路。</p>
                ) : (
                  <div className="episode-grid">
                    {line.episodes.map((e) => (
                      <button
                        key={e.id}
                        title={e.title}
                        aria-pressed={episode?.id === e.id}
                        onClick={() => playback.selectEpisode(e.id)}
                      >
                        {e.title}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </aside>
      </div>
    </article>
  );
}
