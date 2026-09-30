import type { Anime, Book, AnimeRegionFilter } from '@hanacg/domain';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/connection';
import { subjects } from '../db/schema';
export interface CatalogQuery {
  kind: 'anime' | 'novel' | 'manga';
  q?: string;
  limit?: number;
  offset?: number;
  year?: number;
  tag?: string;
  minScore?: number;
  series?: boolean;
  region?: AnimeRegionFilter;
}
export function createCatalog(database: Database) {
  async function rows(query: CatalogQuery, id?: number, calendar = false) {
    const where = [
      eq(subjects.kind, query.kind),
      eq(subjects.publicationStatus, 'published'),
      eq(subjects.nsfw, false),
    ];
    if (id !== undefined) where.push(eq(subjects.id, id));
    if (query.q) {
      const pattern = `%${query.q.replace(/[\\%_]/g, '\\$&')}%`;
      where.push(
        sql`(${subjects.name} ILIKE ${pattern} OR ${subjects.nameCn} ILIKE ${pattern} OR EXISTS (SELECT 1 FROM subject_names n WHERE n.subject_id=${subjects.id} AND n.name ILIKE ${pattern}))`,
      );
    }
    if (query.region && query.region !== 'all')
      where.push(
        query.region === 'unknown'
          ? sql`cardinality(${subjects.regions})=0`
          : sql`${query.region}=ANY(${subjects.regions})`,
      );
    if (query.year) where.push(sql`left(${subjects.releaseDate},4)=${String(query.year)}`);
    if (query.tag)
      where.push(
        sql`EXISTS(SELECT 1 FROM subject_tags t WHERE t.subject_id=${subjects.id} AND t.name=${query.tag})`,
      );
    if (query.series !== undefined) where.push(eq(subjects.series, query.series));
    if (query.minScore)
      where.push(
        sql`EXISTS(SELECT 1 FROM subject_external_ratings r WHERE r.subject_id=${subjects.id} AND r.score>=${query.minScore})`,
      );
    if (calendar)
      where.push(
        sql`EXISTS(SELECT 1 FROM release_schedules s WHERE s.subject_id=${subjects.id} AND s.checked_at > now()-interval '2 days')`,
      );
    return database.db
      .select({
        subject: subjects,
        score: sql<
          number | null
        >`(SELECT score FROM subject_external_ratings r WHERE r.subject_id=${subjects.id} ORDER BY checked_at DESC LIMIT 1)`,
        tags: sql<
          string[]
        >`ARRAY(SELECT DISTINCT name FROM subject_tags t WHERE t.subject_id=${subjects.id} ORDER BY name)`,
        updatedEpisodes: sql<
          number | null
        >`(SELECT latest_listed_number FROM subject_update_state u WHERE u.subject_id=${subjects.id} AND u.source_checked_at > now()-interval '1 day')`,
        weekday: sql<
          number | null
        >`(SELECT weekday FROM release_schedules s WHERE s.subject_id=${subjects.id} AND s.checked_at > now()-interval '2 days' ORDER BY checked_at DESC LIMIT 1)`,
      })
      .from(subjects)
      .where(and(...where))
      .orderBy(
        sql`(SELECT rank FROM subject_external_ratings r WHERE r.subject_id=${subjects.id} ORDER BY checked_at DESC LIMIT 1) ASC NULLS LAST`,
        subjects.id,
      )
      .limit(query.limit ?? 24)
      .offset(query.offset ?? 0);
  }
  const anime = (r: Awaited<ReturnType<typeof rows>>[number]): Anime => ({
    id: r.subject.id,
    title: r.subject.nameCn || r.subject.name,
    originalTitle: r.subject.name,
    summary: r.subject.summary,
    cover: r.subject.cover,
    score: r.score ?? 0,
    year: Number(r.subject.releaseDate?.slice(0, 4)) || 0,
    airDate: r.subject.releaseDate ?? '',
    episodes: r.subject.episodeCount ?? 0,
    tags: r.tags,
    regions: r.subject.regions,
    releaseStatus:
      r.subject.releaseStatus === 'completed'
        ? 'completed'
        : r.subject.releaseStatus === 'upcoming' ||
            (r.subject.releaseDate && r.subject.releaseDate > new Date().toISOString().slice(0, 10))
          ? 'upcoming'
          : r.subject.releaseStatus === 'ongoing' || r.weekday
            ? 'ongoing'
            : 'unknown',
    ...(r.updatedEpisodes && r.updatedEpisodes > 0 ? { updatedEpisodes: r.updatedEpisodes } : {}),
    ...(r.weekday ? { weekday: r.weekday } : {}),
  });
  const book = (r: Awaited<ReturnType<typeof rows>>[number]): Book => ({
    id: r.subject.id,
    kind: r.subject.kind as Book['kind'],
    title: r.subject.nameCn || r.subject.name,
    originalTitle: r.subject.name,
    cover: r.subject.cover,
    score: r.score ?? 0,
    year: Number(r.subject.releaseDate?.slice(0, 4)) || 0,
    tags: r.tags,
    author: r.subject.author,
    status:
      r.subject.releaseStatus === 'completed'
        ? '已完结'
        : r.subject.releaseStatus === 'ongoing'
          ? '连载中'
          : 'unknown',
  });
  async function resolveId(id: number) {
    if (id >= 1_000_000_000) return id;
    const result = await database.pool.query<{ subject_id: number }>(
      `SELECT subject_id FROM subject_external_refs WHERE provider='bangumi' AND external_id=$1`,
      [String(id)],
    );
    return result.rows[0]?.subject_id ?? null;
  }
  return {
    resolveId,
    async list(query: CatalogQuery) {
      return (await rows(query)).map((r) => (query.kind === 'anime' ? anime(r) : book(r)));
    },
    async calendar() {
      return (await rows({ kind: 'anime', limit: 500 }, undefined, true)).map(anime);
    },
    async anime(id: number) {
      const resolved = await resolveId(id);
      if (!resolved) return null;
      const r = (await rows({ kind: 'anime' }, resolved))[0];
      return r ? anime(r) : null;
    },
    async episodes(id: number) {
      const resolved = await resolveId(id);
      if (!resolved) return [];
      const result = await database.pool.query(
        `SELECT e.id,e.type,e.sort,e.number,e.name,e.name_cn AS "nameCn",e.air_date AS "airDate",e.summary FROM episodes e JOIN subjects s ON s.id=e.subject_id WHERE e.subject_id=$1 AND s.publication_status='published' AND NOT s.nsfw ORDER BY e.type,e.sort,e.id`,
        [resolved],
      );
      return result.rows;
    },
    async progress(id: number) {
      const resolved = await resolveId(id);
      if (!resolved) return null;
      const result = await database.pool.query(
        `SELECT u.listed_episode_count AS "listedEpisodeCount",u.latest_listed_number AS "latestListedNumber",u.source_checked_at AS "sourceCheckedAt" FROM subject_update_state u JOIN subjects s ON s.id=u.subject_id WHERE u.subject_id=$1 AND s.publication_status='published' AND NOT s.nsfw`,
        [resolved],
      );
      return result.rows[0] ?? null;
    },
  };
}
export type Catalog = ReturnType<typeof createCatalog>;
