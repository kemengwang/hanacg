import { randomUUID } from 'node:crypto';
import type { Database } from '../db/connection';
export interface Job {
  key: string;
  kind: string;
  payload: unknown;
  failures: number;
  lease_token: string;
}
export async function enqueue(database: Database, key: string, kind: string, payload: unknown) {
  await database.pool.query(
    'INSERT INTO sync_jobs(key,kind,payload) VALUES($1,$2,$3) ON CONFLICT(key) DO NOTHING',
    [key, kind, JSON.stringify(payload)],
  );
}
export async function claim(database: Database): Promise<Job | undefined> {
  const r = await database.pool.query<Job>(
    `UPDATE sync_jobs SET lease_token=$1,lease_until=now()+interval '15 minutes' WHERE key=(SELECT key FROM sync_jobs WHERE next_run_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_run_at,key FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING key,kind,payload,failures,lease_token`,
    [randomUUID()],
  );
  return r.rows[0];
}
export function retryDelay(failures: number, retryAfter = 0) {
  return Math.max(retryAfter, Math.min(86400000, 60_000 * 2 ** Math.min(failures, 10)));
}
export async function finish(database: Database, job: Job, delay: number, error?: string) {
  await database.pool.query(
    `UPDATE sync_jobs SET lease_token=NULL,lease_until=NULL,next_run_at=now()+$3*interval '1 millisecond',failures=CASE WHEN $4::text IS NULL THEN 0 ELSE failures+1 END,last_error=$4 WHERE key=$1 AND lease_token=$2`,
    [job.key, job.lease_token, delay, error ?? null],
  );
}
