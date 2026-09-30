import type { Database } from '../db/connection';
import type { SourceAdapter } from '@hanacg/source-engine';
import { importSubject } from '../catalog/importer';
import { normalizeCalendar, normalizeSubject, object } from '../catalog/normalize';
import { enqueue, claim, finish, retryDelay, type Job } from './jobs';
import { MetadataClient, UpstreamError } from './upstream';
import { storeSourceLines } from './sources';
const HOUR = 3600000;
export async function seedJobs(database: Database) {
  await enqueue(database, 'calendar', 'calendar', {});
  for (const kind of ['anime', 'novel', 'manga']) {
    await enqueue(database, `discover:${kind}`, 'discover', { kind, offset: 0, sort: 'date' });
    await enqueue(database, `ranking:${kind}`, 'discover', {
      kind,
      offset: 0,
      sort: 'rank',
      once: true,
    });
  }
}
export async function executeJob(
  database: Database,
  client: MetadataClient,
  adapters: SourceAdapter[],
  job: Job,
) {
  const p = object(job.payload);
  if (job.kind === 'discover') {
    const type =
      p.kind === 'anime'
        ? 'type=2'
        : p.kind === 'novel'
          ? 'type=1&cat=1002'
          : p.kind === 'manga'
            ? 'type=1&cat=1001'
            : '';
    if (!type) throw new Error('Invalid discovery type');
    const offset = Number(p.offset) || 0;
    const r = object(
      await client.json(
        `/v0/subjects?${type}&sort=${p.sort === 'rank' ? 'rank' : 'date'}&limit=24&offset=${offset}`,
      ),
    );
    if (!Array.isArray(r.data)) throw new Error('Invalid discovery page');
    for (const item of r.data) {
      const id = object(item).id;
      if (!Number.isSafeInteger(id) || Number(id) <= 0) throw new Error('Invalid discovery ID');
      await enqueue(database, `subject:${id}`, 'subject', { id: String(id) });
    }
    // Bounded rotating pages discover entries beyond the first page; full backfills use CLI.
    if (!p.once)
      await database.pool.query('UPDATE sync_jobs SET payload=$2 WHERE key=$1 AND lease_token=$3', [
        job.key,
        JSON.stringify({ ...p, offset: r.data.length < 24 || offset >= 216 ? 0 : offset + 24 }),
        job.lease_token,
      ]);
    return p.once ? 7 * 24 * HOUR : 6 * HOUR;
  }
  if (job.kind === 'calendar') {
    const entries = normalizeCalendar(await client.json('/calendar'));
    if (!entries.length) throw new Error('Empty calendar; retained previous schedule');
    const c = await database.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("DELETE FROM release_schedules WHERE provider='bangumi'");
      for (const e of entries) {
        await c.query(
          `INSERT INTO release_schedules(subject_id,provider,weekday) SELECT subject_id,'bangumi',$2 FROM subject_external_refs WHERE provider='bangumi' AND external_id=$1 ON CONFLICT(subject_id,provider) DO UPDATE SET weekday=EXCLUDED.weekday,checked_at=now()`,
          [e.externalId, e.weekday],
        );
        await c.query(
          `INSERT INTO sync_jobs(key,kind,payload) VALUES($1,'subject',$2) ON CONFLICT(key) DO UPDATE SET payload=EXCLUDED.payload,next_run_at=least(sync_jobs.next_run_at,now())`,
          [
            `subject:${e.externalId}`,
            JSON.stringify({
              id: e.externalId,
              weekday: e.weekday,
              calendarAt: new Date().toISOString(),
            }),
          ],
        );
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
    return 6 * HOUR;
  }
  if (job.kind === 'subject') {
    const id = String(p.id);
    if (!/^[1-9]\d*$/.test(id)) throw new Error('Invalid subject ID');
    const raw = await client.json(`/v0/subjects/${id}`);
    const subject = normalizeSubject(raw);
    if (!subject) return 30 * 24 * HOUR;
    const episodes = subject.kind === 'anime' ? await client.episodes(id) : undefined;
    const relations = await client.json(`/v0/subjects/${id}/subjects`);
    const internalId = await importSubject(database, raw, episodes, relations);
    const recentCalendar =
      typeof p.calendarAt === 'string' && Date.now() - Date.parse(p.calendarAt) < 2 * 24 * HOUR;
    if (
      internalId &&
      recentCalendar &&
      Number.isInteger(p.weekday) &&
      Number(p.weekday) >= 1 &&
      Number(p.weekday) <= 7
    )
      await database.pool.query(
        `INSERT INTO release_schedules(subject_id,provider,weekday,checked_at) VALUES($1,'bangumi',$2,$3) ON CONFLICT(subject_id,provider) DO UPDATE SET weekday=EXCLUDED.weekday,checked_at=EXCLUDED.checked_at`,
        [internalId, p.weekday, p.calendarAt],
      );
    return recentCalendar || subject.releaseStatus === 'ongoing' ? 4 * HOUR : 7 * 24 * HOUR;
  }
  if (job.kind === 'source') {
    const result = await database.pool.query<{
      id: number;
      source_id: string;
      external_id: string;
      active: boolean;
    }>(
      `SELECT s.*,EXISTS(SELECT 1 FROM release_schedules r WHERE r.subject_id=s.subject_id AND r.checked_at>now()-interval '2 days') active FROM source_entries s WHERE s.id=$1`,
      [p.id],
    );
    const entry = result.rows[0];
    if (!entry) throw new Error('Unknown source entry');
    const adapter = adapters.find((a) => a.info.id === entry.source_id);
    if (!adapter) throw new Error('Source disabled');
    const lines = await adapter.episodes(entry.external_id, AbortSignal.timeout(30000));
    await storeSourceLines(database, entry.id, lines);
    // Calendar has no precise airing hour. Avoid pretending to know an update window.
    return entry.active ? 2 * HOUR : 24 * HOUR;
  }
  throw new Error('Unknown job type');
}
export async function runOne(
  database: Database,
  client: MetadataClient,
  adapters: SourceAdapter[],
) {
  const job = await claim(database);
  if (!job) return false;
  const r = await database.pool.query<{ id: number }>(
    "INSERT INTO sync_runs(job_key,status) VALUES($1,'running') RETURNING id",
    [job.key],
  );
  const heartbeat = setInterval(() => {
    void database.pool
      .query(
        "UPDATE sync_jobs SET lease_until=now()+interval '15 minutes' WHERE key=$1 AND lease_token=$2",
        [job.key, job.lease_token],
      )
      .catch(() => undefined);
  }, 60000);
  try {
    const next = await executeJob(database, client, adapters, job);
    await finish(database, job, next);
    await database.pool.query(
      "UPDATE sync_runs SET status='success',finished_at=now() WHERE id=$1",
      [r.rows[0]!.id],
    );
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 300) : 'Sync failed';
    const pause =
      e instanceof UpstreamError
        ? Math.max(e.retryAfterMs, [401, 403, 429].includes(e.status) ? HOUR : 0)
        : 0;
    await finish(database, job, retryDelay(job.failures, pause), message);
    if (pause)
      await database.pool.query(
        "UPDATE sync_jobs SET next_run_at=greatest(next_run_at,now()+$1*interval '1 millisecond') WHERE kind IN ('discover','calendar','subject')",
        [pause],
      );
    await database.pool.query(
      "UPDATE sync_runs SET status='failed',finished_at=now(),error=$2 WHERE id=$1",
      [r.rows[0]!.id, message],
    );
    console.warn(`${job.key}: ${message}`);
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}
