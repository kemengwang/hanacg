import { buildServer } from './app';
import { closeNetwork } from './network';
const server = buildServer(undefined, true);
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
