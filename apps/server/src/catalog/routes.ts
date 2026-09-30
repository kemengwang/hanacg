import type { FastifyInstance } from 'fastify';
import type { Catalog, CatalogQuery } from './repository';
export function registerCatalogRoutes(app: FastifyInstance, catalog?: Catalog) {
  const available = () => {
    if (!catalog) throw Object.assign(new Error('目录数据库未配置'), { statusCode: 503 });
    return catalog;
  };
  app.post<{ Body: { ids: number[] } }>(
    '/api/catalog/resolve-ids',
    {
      schema: {
        body: {
          type: 'object',
          required: ['ids'],
          additionalProperties: false,
          properties: {
            ids: {
              type: 'array',
              maxItems: 200,
              items: { type: 'integer', minimum: 1, maximum: 999999999 },
            },
          },
        },
      },
    },
    async (request) => {
      const result: Record<string, number> = {};
      for (const id of new Set(request.body.ids)) {
        const resolved = await available().resolveId(id);
        if (resolved) result[id] = resolved;
      }
      return { ids: result };
    },
  );
  app.get<{ Querystring: CatalogQuery }>(
    '/api/catalog/subjects',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['kind'],
          additionalProperties: false,
          properties: {
            kind: { enum: ['anime', 'novel', 'manga'] },
            q: { type: 'string', maxLength: 200 },
            region: { enum: ['all', 'japan', 'china', 'western', 'korea', 'other', 'unknown'] },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            offset: { type: 'integer', minimum: 0, maximum: 1000000 },
            year: { type: 'integer', minimum: 1800, maximum: 2200 },
            tag: { type: 'string', maxLength: 80 },
            minScore: { type: 'number', minimum: 0, maximum: 10 },
            series: { type: 'boolean' },
          },
        },
      },
    },
    async (request) => ({ items: await available().list(request.query) }),
  );
  app.get('/api/catalog/calendar', async () => ({ items: await available().calendar() }));
  app.get<{ Params: { id: string } }>(
    '/api/catalog/subjects/:id/episodes',
    {
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'string', pattern: '^[1-9][0-9]{0,9}$' } },
          required: ['id'],
        },
      },
    },
    async (request) => ({
      items: await available().episodes(Number(request.params.id)),
      progress: await available().progress(Number(request.params.id)),
    }),
  );
}
