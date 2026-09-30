import { backfillRegions } from './backfill-regions';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { connectDatabase } from './connection';
const database = connectDatabase();
try {
  await migrate(database.db, {
    migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)),
  });
  const updated = await backfillRegions(database);
  console.log(`Database migrations applied; ${updated} region records updated`);
} finally {
  await database.close();
}
