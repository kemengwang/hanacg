import { buildServer } from './app';
import { closeNetwork } from './network';
import { connectDatabase } from './db/connection';
const database = process.env.DATABASE_URL ? connectDatabase() : undefined;
const server = buildServer(undefined, true, database);
server.addHook('onClose', async () => {
  await database?.close();
});
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, async () => {
    if (closing) return;
    closing = true;
    await closeNetwork();
    await server.close();
  });
await server.listen({
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || '127.0.0.1',
});
