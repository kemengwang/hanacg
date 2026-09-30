import { setTimeout as delay } from 'node:timers/promises';
import { object } from '../catalog/normalize';
export class UpstreamError extends Error {
  constructor(
    public status: number,
    public retryAfterMs: number,
  ) {
    super(`Metadata upstream HTTP ${status}`);
  }
}
export class MetadataClient {
  private lastRequest = 0;
  private chain: Promise<unknown> = Promise.resolve();
  constructor(
    private request: typeof fetch = fetch,
    private interval = Math.max(1000, Number(process.env.BANGUMI_INTERVAL_MS) || 1500),
  ) {}
  json(path: string): Promise<unknown> {
    const run = this.chain.then(async () => {
      if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid metadata path');
      await delay(Math.max(0, this.lastRequest + this.interval - Date.now()));
      this.lastRequest = Date.now();
      const response = await this.request(`https://api.bgm.tv${path}`, {
        headers: {
          'User-Agent':
            process.env.BANGUMI_USER_AGENT ||
            'kemengwang/HanaACG/0.1.0 (https://github.com/kemengwang/hanacg)',
          ...(process.env.BANGUMI_ACCESS_TOKEN
            ? { Authorization: `Bearer ${process.env.BANGUMI_ACCESS_TOKEN}` }
            : {}),
        },
        signal: AbortSignal.timeout(20_000),
        redirect: 'error',
      });
      if (!response.ok) {
        const retry = response.headers.get('retry-after');
        const ms = retry
          ? /^\d+$/.test(retry)
            ? Number(retry) * 1000
            : Date.parse(retry) - Date.now()
          : 0;
        await response.body?.cancel();
        throw new UpstreamError(response.status, Number.isFinite(ms) ? Math.max(0, ms) : 0);
      }
      if (!response.body) throw new Error('Empty metadata response');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 8_000_000) throw new Error('Metadata response too large');
          chunks.push(part.value);
        }
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      const body = Buffer.concat(chunks).toString('utf8');
      return JSON.parse(body) as unknown;
    });
    this.chain = run.catch(() => undefined);
    return run;
  }
  async episodes(id: string) {
    const all: unknown[] = [];
    for (let offset = 0; offset < 20_000; offset += 200) {
      const page = object(
        await this.json(
          `/v0/episodes?subject_id=${encodeURIComponent(id)}&limit=200&offset=${offset}`,
        ),
      );
      if (
        !Array.isArray(page.data) ||
        typeof page.total !== 'number' ||
        !Number.isSafeInteger(page.total) ||
        page.total < 0
      )
        throw new Error('Invalid episode page');
      all.push(...page.data);
      if (all.length >= page.total) return all;
      if (!page.data.length) throw new Error('Incomplete episode pagination');
    }
    throw new Error('Episode pagination limit exceeded');
  }
}
