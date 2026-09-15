import { randomBytes } from 'node:crypto';
import type { MediaResource } from '@hanacg/platform';
import { checkedUrl } from './network';

export interface MediaTicket {
  resource: MediaResource;
  expires: number;
}
export class MediaTickets {
  private entries = new Map<string, MediaTicket & { key: string }>();
  private reverse = new Map<string, string>();
  private lastSweep = 0;
  constructor(
    private now = Date.now,
    private max = 20_000,
  ) {}
  private remove(token: string) {
    const entry = this.entries.get(token);
    if (entry) this.reverse.delete(entry.key);
    this.entries.delete(token);
  }
  issue(resource: MediaResource, expires = this.now() + 6 * 60 * 60 * 1000): string {
    checkedUrl(resource.url);
    const key = JSON.stringify([resource.url, resource.headers, resource.mimeType, expires]);
    if (this.now() - this.lastSweep > 60_000) {
      for (const [token, entry] of this.entries)
        if (entry.expires <= this.now()) this.remove(token);
      this.lastSweep = this.now();
    }
    const existing = this.reverse.get(key);
    if (existing && this.get(existing)) return `/api/media/${existing}`;
    if (this.entries.size >= this.max) this.remove(this.entries.keys().next().value!);
    const token = randomBytes(24).toString('base64url');
    this.entries.set(token, { resource, expires, key });
    this.reverse.set(key, token);
    return `/api/media/${token}`;
  }
  get(token: string): MediaTicket | undefined {
    const entry = this.entries.get(token);
    if (!entry || entry.expires <= this.now()) {
      this.remove(token);
      return undefined;
    }
    return entry;
  }
}
export function rewritePlaylist(
  text: string,
  base: string,
  issue: (url: string) => string,
): string {
  if (!text.trimStart().startsWith('#EXTM3U')) throw new Error('来源未返回有效的 HLS 播放列表');
  const absolute = (value: string) => {
    if (/\{\$/.test(value)) throw new Error('暂不支持此 HLS 变量，请切换线路');
    return issue(checkedUrl(new URL(value, base).href).href);
  };
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim()) return line;
      if (line.startsWith('#'))
        return line.replace(/\bURI="([^"]+)"/g, (_, uri: string) => `URI="${absolute(uri)}"`);
      return absolute(line.trim());
    })
    .join('\n');
}
