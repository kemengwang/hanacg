import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { Readable } from 'node:stream';
import { curatedAnime, parseAnime } from '@hanacg/api-client';
import type { SourceAdapter, SourceLine, SourceQuery } from '@hanacg/source-engine';
import { sourceHost, upstream, boundedText } from './network';
import { createAnime7, createTvt } from './sources';
import { createXifan } from './xifan';
import { MediaTickets, rewritePlaylist } from './media';

const text = { type: 'string', minLength: 1, maxLength: 200 };
const selection = { sourceId: text, subjectId: text };
const querySchema = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
export function buildServer(
  adapters: SourceAdapter[] = [
    createXifan(sourceHost),
    createAnime7(sourceHost),
    ...(process.env.HANA_ENABLE_TVTFUN === '1' ? [createTvt(sourceHost)] : []),
  ],
  logger = false,
) {
  const app = Fastify({ logger, bodyLimit: 16_384 });
  app.register(rateLimit, { global: false, max: 90, timeWindow: '1 minute' });
  const limited = { rateLimit: { max: 90, timeWindow: '1 minute' } };
  const tickets = new MediaTickets();
  const cache = new Map<string, { value: SourceLine[]; expires: number }>();
  const adapter = (id: string) => {
    const a = adapters.find((a) => a.info.id === id);
    if (!a) throw Object.assign(new Error('来源不存在'), { statusCode: 404 });
    return a;
  };
  async function lines(sourceId: string, subjectId: string, signal: AbortSignal) {
    const key = `${sourceId}:${subjectId}`;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
    const value = await adapter(sourceId).episodes(subjectId, signal);
    if (cache.size >= 128) cache.delete(cache.keys().next().value!);
    cache.set(key, { value, expires: Date.now() + 5 * 60 * 1000 });
    return value;
  }
  // One bounded request lifecycle; closing the client cancels upstream work.
  const signals = new WeakMap<object, AbortSignal>();
  app.addHook('onRequest', async (request, reply) => {
    const controller = new AbortController();
    reply.raw.once('close', () => {
      if (!reply.raw.writableFinished) controller.abort();
    });
    signals.set(request, AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]));
  });
  app.setErrorHandler((error, request, reply) => {
    const e = error as Error & { statusCode?: number; validation?: unknown };
    const status = e.validation
      ? 400
      : e.statusCode && e.statusCode >= 400 && e.statusCode < 500
        ? e.statusCode
        : 502;
    request.log.warn({ err: e }, 'Request failed');
    reply.code(status).send({
      error:
        status === 400
          ? '请求参数无效'
          : status === 429
            ? '请求过于频繁，请稍后再试'
            : status === 404
              ? e.message
              : '来源暂时不可用，请重试或切换来源',
    });
  });
  app.get('/api/health', async () => ({ status: 'ok' }));
  app.get('/api/sources', async () => ({ sources: adapters.map((a) => a.info) }));
  app.get<{ Params: { id: string } }>(
    '/api/anime/:id',
    {
      config: limited,
      schema: { params: querySchema({ id: { type: 'string', pattern: '^[1-9][0-9]{0,9}$' } }) },
    },
    async (request) => {
      const id = Number(request.params.id);
      const local = curatedAnime.find((a) => a.id === id);
      if (local) return { anime: local, origin: 'snapshot' };
      const anime = parseAnime(
        await sourceHost.json(`https://api.bgm.tv/v0/subjects/${id}`, signals.get(request)),
      );
      if (!anime) throw Object.assign(new Error('未找到番剧资料'), { statusCode: 404 });
      return { anime, origin: 'online' };
    },
  );
  app.get<{ Querystring: SourceQuery }>(
    '/api/playback/search',
    {
      config: limited,
      schema: {
        querystring: querySchema(
          {
            animeId: { type: 'integer', minimum: 1 },
            title: text,
            originalTitle: { type: 'string', maxLength: 200 },
          },
          ['animeId', 'title'],
        ),
      },
    },
    async (request) => {
      const results = await Promise.all(
        adapters.map(async (a) => {
          try {
            return {
              source: a.info,
              matches: await a.search(
                { ...request.query, originalTitle: request.query.originalTitle || '' },
                signals.get(request),
              ),
            };
          } catch {
            return {
              source: a.info,
              matches: [],
              error: '暂时无法连接此来源，可重试或选择其他来源',
            };
          }
        }),
      );
      return { results };
    },
  );
  app.get<{ Querystring: { sourceId: string; subjectId: string } }>(
    '/api/playback/episodes',
    { config: limited, schema: { querystring: querySchema(selection) } },
    async (request) => ({
      lines: await lines(request.query.sourceId, request.query.subjectId, signals.get(request)!),
    }),
  );
  app.get<{
    Querystring: { sourceId: string; subjectId: string; lineId: string; episodeId: string };
  }>(
    '/api/playback/resolve',
    {
      config: limited,
      schema: { querystring: querySchema({ ...selection, lineId: text, episodeId: text }) },
    },
    async (request) => {
      const { sourceId, subjectId, lineId, episodeId } = request.query;
      const all = await lines(sourceId, subjectId, signals.get(request)!);
      if (!all.find((l) => l.id === lineId)?.episodes.some((e) => e.id === episodeId))
        throw Object.assign(new Error('分集不属于当前来源'), { statusCode: 404 });
      const resource = await adapter(sourceId).resolve(
        subjectId,
        lineId,
        episodeId,
        signals.get(request),
      );
      return { resource: { url: tickets.issue(resource), mimeType: resource.mimeType } };
    },
  );
  app.get<{ Params: { token: string } }>('/api/media/:token', async (request, reply) => {
    const ticket = tickets.get(request.params.token);
    if (!ticket) return reply.code(410).send({ error: '播放地址已过期，请重新解析' });
    const headers = { ...ticket.resource.headers };
    const range = request.headers.range;
    if (range) {
      if (!/^bytes=\d*-\d*$/.test(range)) return reply.code(416).send();
      headers.Range = range;
    }
    // Streaming has its own lifecycle; long MP4 responses aren't cut off at the API deadline.
    const controller = new AbortController();
    reply.raw.once('close', () => controller.abort());
    const response = await upstream(ticket.resource.url, controller.signal, headers);
    if (![200, 206].includes(response.statusCode)) {
      response.body.destroy();
      return reply
        .code(response.statusCode === 416 ? 416 : 502)
        .send({ error: '媒体暂时无法访问，请换源或重新解析' });
    }
    const contentType = String(
      response.headers['content-type'] || ticket.resource.mimeType || 'application/octet-stream',
    );
    const hls = /mpegurl/i.test(contentType) || /\.m3u8(?:\?|$)/i.test(response.url);
    reply.header('Cache-Control', 'private, no-store').header('X-Content-Type-Options', 'nosniff');
    if (hls) {
      const playlist = await boundedText(response.body, 2 * 1024 * 1024);
      return reply.type('application/vnd.apple.mpegurl').send(
        rewritePlaylist(playlist, response.url, (url) =>
          tickets.issue(
            {
              url,
              headers:
                new URL(url).origin === new URL(ticket.resource.url).origin
                  ? ticket.resource.headers
                  : Object.fromEntries(
                      Object.entries(ticket.resource.headers || {}).filter(
                        ([key]) =>
                          !['cookie', 'authorization', 'apikey'].includes(key.toLowerCase()),
                      ),
                    ),
            },
            ticket.expires,
          ),
        ),
      );
    }
    // Never serve third-party HTML/scripts from our own origin.
    if (/text\/html|javascript|xml|json|svg/i.test(contentType)) {
      response.body.destroy();
      throw new Error('无效的媒体响应');
    }
    for (const key of ['content-length', 'content-range', 'accept-ranges'])
      if (response.headers[key]) reply.header(key, response.headers[key]);
    return reply.code(response.statusCode).type(contentType).send(Readable.from(response.body));
  });
  return app;
}
