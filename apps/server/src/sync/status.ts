import { connectDatabase } from '../db/connection';
const database = connectDatabase();
try {
  const subjects = await database.pool.query(
    'SELECT kind,count(*)::integer AS count FROM subjects GROUP BY kind ORDER BY kind',
  );
  const counts = await database.pool.query(
    'SELECT (SELECT count(*)::integer FROM episodes) episodes,(SELECT count(*)::integer FROM release_schedules) schedules,(SELECT count(*)::integer FROM source_entries) source_entries',
  );
  const jobs = await database.pool.query(
    'SELECT kind,count(*)::integer AS count,count(*) FILTER(WHERE next_run_at<=now())::integer AS due,count(*) FILTER(WHERE failures>0)::integer AS failing FROM sync_jobs GROUP BY kind ORDER BY kind',
  );
  console.log(
    JSON.stringify({ subjects: subjects.rows, ...counts.rows[0], jobs: jobs.rows }, null, 2),
  );
} finally {
  await database.close();
}
