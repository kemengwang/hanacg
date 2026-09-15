import { useEffect, useRef, useState } from 'react';
import type { MediaResource } from '@hanacg/platform';
import type { PlayerState } from '@hanacg/player-contract';
import { createWebPlayer } from './player';

export function VideoPlayer({
  resource,
  title,
  resume = 0,
  onProgress,
  onRetry,
}: {
  resource: MediaResource;
  title: string;
  resume?: number;
  onProgress: (position: number, duration: number) => void;
  onRetry: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  const [state, setState] = useState<PlayerState>({ status: 'loading', position: 0, duration: 0 });
  useEffect(() => {
    const video = videoRef.current!;
    const player = createWebPlayer(video);
    let played = false;
    let lastSave = 0;
    let restored = false;
    const restore = () => {
      if (!restored) {
        restored = true;
        if (resume > 0 && resume < video.duration - 5) player.seek(resume);
      }
    };
    video.addEventListener('loadedmetadata', restore);
    const persist = () => {
      if (played && video.currentTime > 0 && Number.isFinite(video.duration))
        progressRef.current(video.currentTime, video.duration);
    };
    const unsubscribe = player.subscribe((next) => {
      setState(next);
      if (next.status === 'playing') played = true;
      if (
        played &&
        (next.status === 'paused' || next.status === 'ended' || Date.now() - lastSave > 5000)
      ) {
        lastSave = Date.now();
        persist();
      }
    });
    const visibility = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', visibility);
    void player.load(resource);
    return () => {
      persist();
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', visibility);
      video.removeEventListener('loadedmetadata', restore);
      unsubscribe();
      player.dispose();
    };
  }, [resource, resume]);
  return (
    <div className="video-player">
      <video ref={videoRef} controls playsInline preload="metadata" aria-label={title} />
      {state.status === 'error' && (
        <div className="video-error" role="alert">
          <p>{state.error}</p>
          <button onClick={onRetry}>重新解析</button>
        </div>
      )}
      <span className="sr-only" role="status">
        {state.status === 'loading' ? '正在加载视频' : state.status === 'playing' ? '正在播放' : ''}
      </span>
    </div>
  );
}
