import { connectDatabase } from '../db/connection';
import { MetadataClient } from './upstream';
import { importSubject } from '../catalog/importer';
import { enqueue } from './jobs';
const ids = process.argv.slice(2);
if (!ids.length || ids.some((id) => !/^[1-9]\d{0,8}$/.test(id)))
  throw new Error('Usage: pnpm db:import <external-subject-id> [...]');
const database = connectDatabase();
const client = new MetadataClient();
try {
  for (const id of ids) {
    const raw = await client.json(`/v0/subjects/${id}`);
    const episodes = (raw as { type?: unknown }).type === 2 ? await client.episodes(id) : undefined;
    const relations = await client.json(`/v0/subjects/${id}/subjects`);
    const internalId = await importSubject(database, raw, episodes, relations);
    if (internalId) await enqueue(database, `subject:${id}`, 'subject', { id });
    console.log(
      JSON.stringify({
        externalId: id,
        id: internalId,
        status: internalId ? 'imported' : 'excluded',
      }),
    );
  }
} finally {
  await database.close();
}
