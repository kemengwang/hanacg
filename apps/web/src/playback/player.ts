import Hls from 'hls.js';
import type { PlayerAdapter, PlayerState } from '@hanacg/player-contract';

export function createWebPlayer(video: HTMLVideoElement): PlayerAdapter {
  let hls: Hls | undefined;
  let state: PlayerState = { status: 'idle', position: 0, duration: 0 };
  const listeners = new Set<(state: PlayerState) => void>();
  const emit = (patch: Partial<PlayerState>) => {
    state = {
      ...state,
      ...patch,
      position: video.currentTime || 0,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
    };
    listeners.forEach((fn) => fn(state));
  };
  const handlers: Record<string, () => void> = {
    playing: () => emit({ status: 'playing', error: undefined }),
    waiting: () => emit({ status: 'loading' }),
    pause: () => {
      if (state.status !== 'error') emit({ status: video.ended ? 'ended' : 'paused' });
    },
    ended: () => emit({ status: 'ended' }),
    loadedmetadata: () => emit({ status: 'paused' }),
    timeupdate: () => emit({}),
    error: () => emit({ status: 'error', error: '视频无法播放，请重新解析或切换来源。' }),
  };
  for (const [name, handler] of Object.entries(handlers)) video.addEventListener(name, handler);
  return {
    async load(resource) {
      hls?.destroy();
      hls = undefined;
      video.pause();
      video.removeAttribute('src');
      video.load();
      emit({ status: 'loading', error: undefined });
      const isHls =
        /mpegurl/i.test(resource.mimeType || '') || /\.m3u8(?:\?|$)/i.test(resource.url);
      if (isHls && !video.canPlayType('application/vnd.apple.mpegurl')) {
        if (!Hls.isSupported()) {
          emit({ status: 'error', error: '此浏览器不支持 HLS 播放，请使用新版浏览器。' });
          return;
        }
        hls = new Hls({ enableWorker: true, maxBufferLength: 30 });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            hls?.stopLoad();
            video.pause();
            emit({ status: 'error', error: '视频加载失败，请重新解析或切换来源。' });
          }
        });
        hls.loadSource(resource.url);
        hls.attachMedia(video);
      } else {
        video.src = resource.url;
        video.load();
      }
    },
    play: () => video.play(),
    pause: () => video.pause(),
    seek(seconds) {
      if (Number.isFinite(seconds) && seconds >= 0) video.currentTime = seconds;
    },
    subscribe(fn) {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    dispose() {
      for (const [name, handler] of Object.entries(handlers))
        video.removeEventListener(name, handler);
      listeners.clear();
      hls?.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
    },
  };
}
