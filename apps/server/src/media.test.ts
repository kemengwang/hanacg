import { it, expect } from 'vitest';
import { MediaTickets, rewritePlaylist } from './media';
import { checkedUrl, isPublicAddress } from './network';
it('rewrites nested playlists, segments, encryption keys and init segments', () => {
  const manifest =
    '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"\n#EXT-X-MAP:URI="init.mp4"\n#EXT-X-MEDIA:TYPE=AUDIO,URI="audio/list.m3u8"\n../video/low.m3u8\npart.ts?token=1';
  const urls: string[] = [];
  const result = rewritePlaylist(manifest, 'https://cdn.example/live/master.m3u8', (url) => {
    urls.push(url);
    return `/ticket/${urls.length}`;
  });
  expect(urls).toEqual([
    'https://cdn.example/live/key.bin',
    'https://cdn.example/live/init.mp4',
    'https://cdn.example/live/audio/list.m3u8',
    'https://cdn.example/video/low.m3u8',
    'https://cdn.example/live/part.ts?token=1',
  ]);
  expect(result).toContain('URI="/ticket/1"');
  expect(result).not.toContain('https:');
  expect(() => rewritePlaylist('<html>denied</html>', 'https://cdn.example', (x) => x)).toThrow();
  expect(() =>
    rewritePlaylist('#EXTM3U\nhttp://127.0.0.1/private', 'https://cdn.example', (x) => x),
  ).toThrow();
});
it('issues bounded, expiring capabilities instead of accepting arbitrary URLs', () => {
  let now = 0;
  const tickets = new MediaTickets(() => now, 2);
  const first = tickets.issue({ url: 'https://cdn.example/a.mp4' }, 10).split('/').pop()!;
  expect(tickets.get(first)?.resource.url).toContain('a.mp4');
  now = 11;
  expect(tickets.get(first)).toBeUndefined();
  const a = tickets.issue({ url: 'https://cdn.example/a.mp4' });
  tickets.issue({ url: 'https://cdn.example/b.mp4' });
  tickets.issue({ url: 'https://cdn.example/c.mp4' });
  expect(tickets.get(a.split('/').pop()!)).toBeUndefined();
});
it('rejects loopback, private, mapped IPv6, reserved and non HTTP addresses', () => {
  for (const ip of [
    '127.0.0.1',
    '10.0.0.1',
    '192.168.0.1',
    '169.254.169.254',
    '::1',
    '::ffff:127.0.0.1',
    'fd00::1',
    '198.18.0.1',
  ])
    expect(isPublicAddress(ip)).toBe(false);
  expect(isPublicAddress('1.1.1.1')).toBe(true);
  for (const url of [
    'file:///etc/passwd',
    'http://user:pass@example.com',
    'http://127.1/a',
    'http://[::1]/',
    'http://localhost',
    'https://example.com:22',
  ])
    expect(() => checkedUrl(url)).toThrow();
});
