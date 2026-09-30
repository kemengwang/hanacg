import type { Database } from '../db/connection';
import { normalizeSubject, normalizeEpisodes, object } from './normalize';
export async function importSubject(
  database: Database,
  raw: unknown,
  episodeRaw?: unknown,
  relationRaw?: unknown,
) {
  const s = normalizeSubject(raw);
  if (!s) return null;
  const episodes = episodeRaw === undefined ? undefined : normalizeEpisodes(episodeRaw);
  if (relationRaw !== undefined && !Array.isArray(relationRaw))
    throw new Error('Invalid relations');
  const relations = Array.isArray(relationRaw)
    ? relationRaw.map((item) => {
        const r = object(item);
        if (!Number.isSafeInteger(r.id) || Number(r.id) <= 0 || typeof r.relation !== 'string')
          throw new Error('Invalid relation');
        return { id: String(r.id), relation: r.relation };
      })
    : undefined;
  const c = await database.pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock($1)', [Number(s.externalId)]);
    const old = await c.query<{ subject_id: number; hash: string }>(
      'SELECT subject_id, hash FROM subject_external_refs WHERE provider=$1 AND external_id=$2',
      ['bangumi', s.externalId],
    );
    let id = old.rows[0]?.subject_id;
    const columns: Record<string, unknown> = {
      kind: s.kind,
      name: s.name,
      name_cn: s.nameCn,
      summary: s.summary,
      format: s.format,
      regions: s.regions,
      series: s.series,
      release_date: s.releaseDate,
      cover: s.cover,
      nsfw: s.nsfw,
      episode_count: s.episodeCount,
      author: s.author,
      infobox: JSON.stringify(s.infobox),
      release_status: s.releaseStatus,
    };
    if (!id) {
      const result = await c.query<{ id: number }>(
        `INSERT INTO subjects (${Object.keys(columns).join(',')}) VALUES (${Object.keys(columns)
          .map((_, i) => `$${i + 1}`)
          .join(',')}) RETURNING id`,
        Object.values(columns),
      );
      id = result.rows[0]!.id;
    } else if (old.rows[0]!.hash !== s.hash) {
      const result = await c.query<{ locked_fields: string[] }>(
        'SELECT locked_fields FROM subjects WHERE id=$1 FOR UPDATE',
        [id],
      );
      const unlocked = Object.entries(columns).filter(
        ([key]) => !result.rows[0]!.locked_fields.includes(key),
      );
      if (unlocked.length)
        await c.query(
          `UPDATE subjects SET ${unlocked.map(([k], i) => `${k}=$${i + 2}`).join(',')}, updated_at=now() WHERE id=$1`,
          [id, ...unlocked.map(([, v]) => v)],
        );
    }
    if (!old.rows.length || old.rows[0]!.hash !== s.hash) {
      await c.query('DELETE FROM subject_names WHERE subject_id=$1 AND provider=$2', [
        id,
        'bangumi',
      ]);
      for (const name of s.aliases)
        await c.query(
          'INSERT INTO subject_names(subject_id,name,provider) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
          [id, name, 'bangumi'],
        );
      await c.query('DELETE FROM subject_tags WHERE subject_id=$1 AND provider=$2', [
        id,
        'bangumi',
      ]);
      for (const name of s.tags)
        await c.query(
          'INSERT INTO subject_tags(subject_id,name,dimension,provider) VALUES($1,$2,$3,$4)',
          [id, name, s.metaTags.includes(name) ? 'public' : 'tag', 'bangumi'],
        );
    }
    await c.query(
      `INSERT INTO subject_external_refs(subject_id,provider,external_id,url,license,raw,hash) VALUES($1,'bangumi',$2,$3,$4,$5,$6) ON CONFLICT(provider,external_id) DO UPDATE SET raw=EXCLUDED.raw,hash=EXCLUDED.hash,checked_at=now()`,
      [
        id,
        s.externalId,
        `https://bgm.tv/subject/${s.externalId}`,
        'CC BY-SA; see https://bangumi.tv/about/copyright',
        JSON.stringify(raw),
        s.hash,
      ],
    );
    await c.query(
      `INSERT INTO subject_external_ratings(subject_id,provider,score,count,rank) VALUES($1,'bangumi',$2,$3,$4) ON CONFLICT(subject_id,provider) DO UPDATE SET score=EXCLUDED.score,count=EXCLUDED.count,rank=EXCLUDED.rank,checked_at=now()`,
      [id, s.score, s.ratingCount, s.rank],
    );
    if (episodes)
      for (const e of episodes)
        await c.query(
          `INSERT INTO episodes(subject_id,provider,external_id,type,sort,number,name,name_cn,air_date,summary) VALUES($1,'bangumi',$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(provider,external_id) DO UPDATE SET type=EXCLUDED.type,sort=EXCLUDED.sort,number=EXCLUDED.number,name=EXCLUDED.name,name_cn=EXCLUDED.name_cn,air_date=EXCLUDED.air_date,summary=EXCLUDED.summary,updated_at=now() WHERE episodes.subject_id=EXCLUDED.subject_id AND (episodes.type,episodes.sort,episodes.number,episodes.name,episodes.name_cn,episodes.air_date,episodes.summary) IS DISTINCT FROM (EXCLUDED.type,EXCLUDED.sort,EXCLUDED.number,EXCLUDED.name,EXCLUDED.name_cn,EXCLUDED.air_date,EXCLUDED.summary)`,
          [id, e.externalId, e.type, e.sort, e.number, e.name, e.nameCn, e.airDate, e.summary],
        );
    if (relations) {
      await c.query('DELETE FROM subject_relations WHERE subject_id=$1 AND provider=$2', [
        id,
        'bangumi',
      ]);
      for (const r of relations)
        await c.query(
          'INSERT INTO subject_relations(subject_id,provider,target_external_id,relation) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
          [id, 'bangumi', r.id, r.relation],
        );
    }
    await c.query('COMMIT');
    return id;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
