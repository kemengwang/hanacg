import { backfillRegions } from './backfill-regions';
/** Integration verification uses a fresh database and never changes the catalog database. */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { connectDatabase } from './connection';
import { importSubject } from '../catalog/importer';
import { createCatalog } from '../catalog/repository';
import { enqueue, claim, finish } from '../sync/jobs';
import { trackSource, storeSourceLines } from '../sync/sources';
import { buildServer } from '../app';
const root = connectDatabase();
const schema = `hana_verify_${Date.now()}`;
await root.pool.query(`CREATE DATABASE ${schema}`);
const url = new URL(process.env.DATABASE_URL!);
url.pathname = `/${schema}`;
const db = connectDatabase(url.href);
try {
  await migrate(db.db, {
    migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)),
  });
  const raw = {
    id: 123,
    type: 2,
    name: 'Test',
    name_cn: '测试',
    date: '2026-09-01',
    infobox: [{ key: '别名', value: [{ v: 'Alias' }] }],
    tags: [{ name: '奇幻' }],
    eps: 12,
    total_episodes: 20,
    meta_tags: ['日本'],
    rating: { score: 8, total: 20, rank: 10 },
  };
  const eps = [
    { id: 1, type: 0, sort: 1, ep: 1, name: 'one', airdate: '2026-09-01' },
    { id: 2, type: 1, sort: 0.5, name: 'SP' },
  ];
  const [id, duplicate] = await Promise.all([
    importSubject(db, raw, eps),
    importSubject(db, raw, eps),
  ]);
  assert.equal(id, duplicate);
  assert.ok(id! >= 1000000000);
  const catalog = createCatalog(db);
  assert.equal((await catalog.anime(123))?.id, id);
  assert.equal((await catalog.list({ kind: 'anime', q: 'Alias' })).length, 1);
  assert.equal((await catalog.list({ kind: 'novel' })).length, 0);
  assert.equal((await catalog.list({ kind: 'anime', q: "' OR true --" })).length, 0);
  await db.pool.query(
    `UPDATE subjects SET name_cn='人工标题',locked_fields='["name_cn"]' WHERE id=$1`,
    [id],
  );
  await importSubject(db, { ...raw, name_cn: '上游修改' });
  assert.equal((await catalog.anime(id!))?.title, '人工标题');
  await assert.rejects(importSubject(db, { ...raw, summary: 'bad update' }, [{ id: 'bad' }]));
  assert.equal((await catalog.anime(id!))?.summary, '');
  const entry = await trackSource(db, id!, 'test', 'remote');
  await storeSourceLines(db, entry, [
    { id: 'a', name: 'A', episodes: [{ id: 'one', title: '第1集', number: 1 }] },
  ]);
  await assert.rejects(storeSourceLines(db, entry, []));
  assert.equal((await catalog.progress(id!))?.listedEpisodeCount, 1);
  assert.equal((await catalog.anime(id!))?.episodes, 12);
  assert.equal((await catalog.anime(id!))?.updatedEpisodes, 1);
  await db.pool.query(
    "UPDATE subject_update_state SET source_checked_at=now()-interval '2 days' WHERE subject_id=$1",
    [id],
  );
  assert.equal((await catalog.anime(id!))?.updatedEpisodes, undefined);
  await db.pool.query("UPDATE subjects SET release_status='completed' WHERE id=$1", [id]);
  assert.equal((await catalog.anime(id!))?.releaseStatus, 'completed');
  await db.pool.query(
    "UPDATE subjects SET release_status='unknown',release_date='2999-01-01' WHERE id=$1",
    [id],
  );
  assert.equal((await catalog.anime(id!))?.releaseStatus, 'upcoming');
  await db.pool.query('DELETE FROM sync_jobs');
  await enqueue(db, 'test', 'subject', { id: '123' });
  const claims = await Promise.all([claim(db), claim(db)]);
  assert.equal(claims.filter(Boolean).length, 1);
  const old = claims.find(Boolean)!;
  await db.pool.query("UPDATE sync_jobs SET lease_until=now()-interval '1 minute'");
  const recovered = (await claim(db))!;
  assert.notEqual(old.lease_token, recovered.lease_token);
  await finish(db, old, 60000);
  assert.equal(
    (await db.pool.query('SELECT lease_token FROM sync_jobs')).rows[0].lease_token,
    recovered.lease_token,
  );
  await finish(db, recovered, 60000);
  const domestic = await importSubject(db, {
    ...raw,
    id: 124,
    name_cn: '国漫样本',
    meta_tags: ['中国'],
  });
  assert.equal((await catalog.list({ kind: 'anime', region: 'china', limit: 1 }))[0]?.id, domestic);
  assert.equal((await catalog.list({ kind: 'anime', region: 'japan', limit: 1 }))[0]?.id, id);
  assert.equal((await catalog.list({ kind: 'anime', region: 'unknown' })).length, 0);
  await db.pool.query("UPDATE subjects SET regions='{}' WHERE id=$1", [id]);
  await backfillRegions(db);
  assert.deepEqual((await catalog.anime(id!))?.regions, ['japan']);
  await db.pool.query(
    `UPDATE subjects SET regions=ARRAY['western'],locked_fields='["regions"]' WHERE id=$1`,
    [id],
  );
  await backfillRegions(db);
  assert.deepEqual((await catalog.anime(id!))?.regions, ['western']);
  const server = buildServer([], false, db);
  const response = await server.inject('/api/catalog/subjects?kind=anime');
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().items[0].id, id);
  assert.ok(!response.body.includes('bangumi'));
  assert.equal(
    (await server.inject('/api/catalog/subjects?kind=anime&limit=1000')).statusCode,
    400,
  );
  assert.equal((await server.inject('/api/anime/123')).json().anime.id, id);
  assert.equal(
    (await server.inject(`/api/catalog/subjects/${id}/episodes`)).json().items.length,
    2,
  );
  assert.equal(
    (await server.inject('/api/catalog/subjects?kind=anime&region=china&limit=1')).json().items[0]
      .id,
    domestic,
  );
  assert.equal(
    (await server.inject('/api/catalog/subjects?kind=anime&region=invalid')).statusCode,
    400,
  );
  await server.close();
  console.log(
    'PASS: migrations, idempotent/concurrent import, legacy IDs, locked edits, rollback, search, source progress, job leases, catalog API',
  );
} finally {
  await db.close();
  await root.pool.query(`DROP DATABASE ${schema}`);
  await root.close();
}
