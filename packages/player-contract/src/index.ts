import type { MediaResource } from '@hanacg/platform';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
export interface PlayerState {
  status: PlayerStatus;
  position: number;
  duration: number;
  error?: string;
}
export interface PlayerAdapter {
  load(resource: MediaResource): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  subscribe(listener: (state: PlayerState) => void): () => void;
  dispose(): void;
}
