import { it, expect } from 'vitest';
import { MockAgent } from 'undici';
import { upstream, checkedUrl } from './network';
import { MediaTickets } from './media';
it('permits only the explicitly configured player origin and never extends media ticket permissions', async () => {
  const allowed = ['https://art.v2player.top:8989'];
  expect(checkedUrl(`${allowed[0]}/player/`, allowed).port).toBe('8989');
  for (const url of [
    'https://art.v2player.top.evil.test:8989/',
    'http://art.v2player.top:8989/',
    'https://other.example:8989/',
    'https://127.0.0.1:8989/',
  ])
    expect(() => checkedUrl(url, allowed)).toThrow();
  expect(() => new MediaTickets().issue({ url: `${allowed[0]}/private.mp4` })).toThrow();
  const agent = new MockAgent();
  agent.disableNetConnect();
  const pool = agent.get(allowed[0]!);
  pool
    .intercept({ path: '/redirect' })
    .reply(302, '', { headers: { location: 'https://other.example:8989/private' } });
  pool
    .intercept({ path: '/private' })
    .reply(302, '', { headers: { location: 'http://127.0.0.1/private' } });
  try {
    for (const path of ['/redirect', '/private'])
      await expect(
        upstream(`${allowed[0]}${path}`, undefined, {}, undefined, agent, allowed),
      ).rejects.toThrow();
  } finally {
    await agent.close();
  }
});
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
