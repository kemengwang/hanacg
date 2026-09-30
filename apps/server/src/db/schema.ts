import type { AnimeRegion } from '@hanacg/domain';
import {
  pgTable,
  integer,
  text,
  boolean,
  jsonb,
  timestamp,
  doublePrecision,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
const time = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
export const subjects = pgTable(
  'subjects',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1_000_000_000 }),
    kind: text('kind', { enum: ['anime', 'novel', 'manga'] }).notNull(),
    name: text('name').notNull(),
    nameCn: text('name_cn').notNull().default(''),
    summary: text('summary').notNull().default(''),
    format: text('format').notNull().default(''),
    regions: text('regions').array().$type<AnimeRegion[]>().notNull().default([]),
    series: boolean('series'),
    releaseDate: text('release_date'),
    cover: text('cover').notNull().default(''),
    nsfw: boolean('nsfw').notNull().default(false),
    publicationStatus: text('publication_status').notNull().default('published'),
    releaseStatus: text('release_status').notNull().default('unknown'),
    episodeCount: integer('episode_count'),
    author: text('author').notNull().default(''),
    infobox: jsonb('infobox').$type<unknown[]>().notNull().default([]),
    lockedFields: jsonb('locked_fields').$type<string[]>().notNull().default([]),
    createdAt: time('created_at').notNull().defaultNow(),
    updatedAt: time('updated_at').notNull().defaultNow(),
  },
  (t) => [index('subjects_catalog_idx').on(t.kind, t.publicationStatus, t.releaseDate)],
);
export const externalRefs = pgTable(
  'subject_external_refs',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subjects.id),
    provider: text('provider').notNull(),
    externalId: text('external_id').notNull(),
    url: text('url').notNull(),
    license: text('license').notNull(),
    raw: jsonb('raw').$type<unknown>().notNull(),
    hash: text('hash').notNull(),
    checkedAt: time('checked_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('external_identity_idx').on(t.provider, t.externalId)],
);
export const names = pgTable(
  'subject_names',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subjects.id),
    name: text('name').notNull(),
    provider: text('provider').notNull(),
  },
  (t) => [uniqueIndex('subject_name_idx').on(t.subjectId, t.name, t.provider)],
);
export const tags = pgTable(
  'subject_tags',
  {
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subjects.id),
    name: text('name').notNull(),
    dimension: text('dimension').notNull(),
    provider: text('provider').notNull(),
  },
  (t) => [uniqueIndex('subject_tag_idx').on(t.subjectId, t.name, t.dimension, t.provider)],
);
export const ratings = pgTable(
  'subject_external_ratings',
  {
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subjects.id),
    provider: text('provider').notNull(),
    score: doublePrecision('score'),
    count: integer('count').notNull().default(0),
    rank: integer('rank'),
    checkedAt: time('checked_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('subject_rating_idx').on(t.subjectId, t.provider)],
);
export const relations = pgTable(
  'subject_relations',
  {
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subjects.id),
    provider: text('provider').notNull(),
    targetExternalId: text('target_external_id').notNull(),
    relation: text('relation').notNull(),
  },
  (t) => [
    uniqueIndex('subject_relation_idx').on(t.subjectId, t.provider, t.targetExternalId, t.relation),
  ],
);
export const episodes = pgTable(
  'episodes',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subjects.id),
    provider: text('provider').notNull(),
    externalId: text('external_id').notNull(),
    type: integer('type').notNull(),
    sort: doublePrecision('sort').notNull(),
    number: doublePrecision('number'),
    name: text('name').notNull(),
    nameCn: text('name_cn').notNull(),
    airDate: text('air_date'),
    summary: text('summary').notNull(),
    updatedAt: time('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('episode_identity_idx').on(t.provider, t.externalId),
    index('episode_subject_idx').on(t.subjectId, t.type, t.sort),
  ],
);
export const schedules = pgTable(
  'release_schedules',
  {
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subjects.id),
    provider: text('provider').notNull(),
    weekday: integer('weekday').notNull(),
    timezone: text('timezone'),
    localTime: text('local_time'),
    checkedAt: time('checked_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('schedule_identity_idx').on(t.subjectId, t.provider)],
);
export const sourceEntries = pgTable(
  'source_entries',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subjects.id),
    sourceId: text('source_id').notNull(),
    externalId: text('external_id').notNull(),
    checkedAt: time('checked_at'),
  },
  (t) => [uniqueIndex('source_entry_identity_idx').on(t.subjectId, t.sourceId, t.externalId)],
);
export const sourceLines = pgTable(
  'source_lines',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    entryId: integer('entry_id')
      .notNull()
      .references(() => sourceEntries.id),
    externalId: text('external_id').notNull(),
    name: text('name').notNull(),
  },
  (t) => [uniqueIndex('source_line_identity_idx').on(t.entryId, t.externalId)],
);
export const sourceEpisodes = pgTable(
  'source_episodes',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    lineId: integer('line_id')
      .notNull()
      .references(() => sourceLines.id),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    number: doublePrecision('number').notNull(),
    episodeId: integer('episode_id').references(() => episodes.id),
    listed: boolean('listed').notNull().default(true),
    firstSeenAt: time('first_seen_at').notNull().defaultNow(),
    checkedAt: time('checked_at').notNull().defaultNow(),
    verifiedAt: time('verified_at'),
  },
  (t) => [uniqueIndex('source_episode_identity_idx').on(t.lineId, t.externalId)],
);
export const updateState = pgTable('subject_update_state', {
  subjectId: integer('subject_id')
    .primaryKey()
    .references(() => subjects.id),
  listedEpisodeCount: integer('listed_episode_count').notNull().default(0),
  latestListedNumber: doublePrecision('latest_listed_number'),
  sourceCheckedAt: time('source_checked_at'),
});
export const jobs = pgTable(
  'sync_jobs',
  {
    key: text('key').primaryKey(),
    kind: text('kind').notNull(),
    payload: jsonb('payload').notNull(),
    nextRunAt: time('next_run_at').notNull().defaultNow(),
    leaseUntil: time('lease_until'),
    leaseToken: text('lease_token'),
    failures: integer('failures').notNull().default(0),
    lastError: text('last_error'),
  },
  (t) => [index('sync_due_idx').on(t.nextRunAt)],
);
export const runs = pgTable('sync_runs', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  jobKey: text('job_key').notNull(),
  startedAt: time('started_at').notNull().defaultNow(),
  finishedAt: time('finished_at'),
  status: text('status').notNull(),
  error: text('error'),
});
