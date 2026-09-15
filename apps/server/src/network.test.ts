import { it, expect } from 'vitest';
import { MockAgent } from 'undici';
import { upstream } from './network';
it('rejecting or abandoning upstream bodies never emits an unhandled abort', async () => {
  const agent = new MockAgent();
  agent.disableNetConnect();
  const pool = agent.get('https://source.example');
  pool.intercept({ path: '/denied' }).reply(403, 'denied');
  pool
    .intercept({ path: '/redirect' })
    .reply(302, 'redirect', { headers: { location: 'http://127.0.0.1/private' } });
  pool.intercept({ path: '/healthy' }).reply(200, 'ok');
  try {
    const denied = await upstream('https://source.example/denied', undefined, {}, undefined, agent);
    denied.body.destroy();
    await new Promise((resolve) => setImmediate(resolve));
    await expect(
      upstream('https://source.example/redirect', undefined, {}, undefined, agent),
    ).rejects.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
    const healthy = await upstream(
      'https://source.example/healthy',
      undefined,
      {},
      undefined,
      agent,
    );
    expect(healthy.statusCode).toBe(200);
    for await (const _chunk of healthy.body) {
      /* drain */
    }
  } finally {
    await agent.close();
  }
});
