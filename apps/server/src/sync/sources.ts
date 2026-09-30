import type { SourceLine } from '@hanacg/source-engine';
import type { Database } from '../db/connection';
import { enqueue } from './jobs';
export async function trackSource(
  database: Database,
  subjectId: number,
  sourceId: string,
  externalId: string,
) {
  const r = await database.pool.query<{ id: number }>(
    `INSERT INTO source_entries(subject_id,source_id,external_id) VALUES($1,$2,$3) ON CONFLICT(subject_id,source_id,external_id) DO UPDATE SET source_id=EXCLUDED.source_id RETURNING id`,
    [subjectId, sourceId, externalId],
  );
  const id = r.rows[0]!.id;
  await enqueue(database, `source:${id}`, 'source', { id });
  return id;
}
export async function storeSourceLines(database: Database, entryId: number, lines: SourceLine[]) {
  // Empty/error responses must not erase previously known availability.
  if (!lines.length || !lines.some((l) => l.episodes.length))
    throw new Error('Empty source directory; retained previous state');
  const c = await database.pool.connect();
  try {
    await c.query('BEGIN');
    const entry = await c.query<{ subject_id: number }>(
      'SELECT subject_id FROM source_entries WHERE id=$1 FOR UPDATE',
      [entryId],
    );
    if (!entry.rows.length) throw new Error('Unknown source entry');
    await c.query(
      'UPDATE source_episodes SET listed=false WHERE line_id IN (SELECT id FROM source_lines WHERE entry_id=$1)',
      [entryId],
    );
    for (const line of lines) {
      const result = await c.query<{ id: number }>(
        `INSERT INTO source_lines(entry_id,external_id,name) VALUES($1,$2,$3) ON CONFLICT(entry_id,external_id) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
        [entryId, line.id, line.name],
      );
      for (const e of line.episodes)
        await c.query(
          `INSERT INTO source_episodes(line_id,external_id,title,number) VALUES($1,$2,$3,$4) ON CONFLICT(line_id,external_id) DO UPDATE SET title=EXCLUDED.title,number=EXCLUDED.number,listed=true,checked_at=now()`,
          [result.rows[0]!.id, e.id, e.title, e.number],
        );
    }
    await c.query('UPDATE source_entries SET checked_at=now() WHERE id=$1', [entryId]);
    // Summary uses one line's count; never adds duplicate episodes across lines.
    await c.query(
      `INSERT INTO subject_update_state(subject_id,listed_episode_count,latest_listed_number,source_checked_at)
      SELECT $1,coalesce(max(n),0),max(latest),now() FROM (SELECT count(*)::integer n,max(e.number) latest FROM source_episodes e JOIN source_lines l ON l.id=e.line_id JOIN source_entries s ON s.id=l.entry_id WHERE s.subject_id=$1 AND e.listed AND s.checked_at>now()-interval '1 day' GROUP BY l.id) a
      ON CONFLICT(subject_id) DO UPDATE SET listed_episode_count=EXCLUDED.listed_episode_count,latest_listed_number=EXCLUDED.latest_listed_number,source_checked_at=EXCLUDED.source_checked_at`,
      [entry.rows[0]!.subject_id],
    );
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
