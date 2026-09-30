import { it, expect, vi } from 'vitest';
import { MetadataClient, UpstreamError } from './upstream';
it('does not follow redirects and preserves upstream retry windows', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '7200' } }));
  const client = new MetadataClient(request, 0);
  const error = await client.json('/calendar').catch((e) => e);
  expect(error).toBeInstanceOf(UpstreamError);
  if (!(error instanceof UpstreamError)) throw new Error('Expected typed upstream failure');
  expect(error.retryAfterMs).toBe(7200000);
  expect(request.mock.calls[0]?.[1]?.redirect).toBe('error');
  expect(request.mock.calls[0]?.[1]?.headers).toHaveProperty('User-Agent');
});
it('fetches every episode page and rejects an incomplete page sequence', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({ total: 201, data: Array.from({ length: 200 }, (_, i) => ({ id: i + 1 })) }),
    )
    .mockResolvedValueOnce(Response.json({ total: 201, data: [{ id: 201 }] }));
  expect(await new MetadataClient(request, 0).episodes('42')).toHaveLength(201);
  expect(String(request.mock.calls[1]?.[0])).toContain('offset=200');
  const empty = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ total: 1, data: [] }));
  await expect(new MetadataClient(empty, 0).episodes('42')).rejects.toThrow('Incomplete');
});
