import { it, expect } from 'vitest';
import { parseMedia, parseLines, parseSourceResults } from './playback';
it('validates playback API responses at runtime', () => {
  expect(() => parseMedia({ resource: { url: 'javascript:alert(1)' } })).toThrow();
  expect(() => parseMedia({ resource: { url: 'https://external.test/private' } })).toThrow();
  expect(parseMedia({ resource: { url: '/api/media/token' } }).url).toBe('/api/media/token');
  expect(() =>
    parseLines({
      lines: [{ id: 'a', name: 'A', episodes: [{ id: '1', title: '1', number: '1' }] }],
    }),
  ).toThrow();
  expect(() =>
    parseSourceResults({
      results: [
        {
          source: { id: 'a', name: 'A', homepage: 'https://a.test' },
          matches: [{ sourceId: 'b' }],
        },
      ],
    }),
  ).toThrow();
});
