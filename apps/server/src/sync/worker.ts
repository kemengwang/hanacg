import { setTimeout as delay } from 'node:timers/promises';
import { connectDatabase } from '../db/connection';
import { defaultAdapters } from '../source-adapters';
import { closeNetwork } from '../network';
import { MetadataClient } from './upstream';
import { seedJobs, runOne } from './runner';
const database = connectDatabase();
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    stopping = true;
  });
const lock = await database.pool.connect();
try {
  // One upstream scheduler across deployments; tasks remain durable and lease-protected.
  const result = await lock.query<{ locked: boolean }>(
    'SELECT pg_try_advisory_lock(724610031) AS locked',
  );
  if (!result.rows[0]?.locked) throw new Error('Another sync worker is already running');
  await seedJobs(database);
  const client = new MetadataClient();
  console.log('Catalog worker ready');
  let cleanupAt = 0;
  while (!stopping) {
    const worked = await runOne(database, client, defaultAdapters());
    if (Date.now() > cleanupAt) {
      await database.pool.query(
        "DELETE FROM sync_runs WHERE started_at < now()-interval '30 days'",
      );
      cleanupAt = Date.now() + 86400000;
    }
    if (process.argv.includes('--once')) break;
    await delay(worked ? 1000 : 5000);
  }
} finally {
  await lock.query('SELECT pg_advisory_unlock(724610031)').catch(() => undefined);
  lock.release();
  await database.close();
  await closeNetwork();
}
