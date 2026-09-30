import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
export function connectDatabase(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is required; see apps/server/.env.example');
  const pool = new pg.Pool({ connectionString: url, max: 5, connectionTimeoutMillis: 5000 });
  return { pool, db: drizzle(pool), close: () => pool.end() };
}
export type Database = ReturnType<typeof connectDatabase>;
