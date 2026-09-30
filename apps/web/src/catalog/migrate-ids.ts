import { curatedAnime, parseStoredAnime } from '@hanacg/api-client';
import { browserNetwork, browserStorage } from '../platform';
const map = new Map<number, number>();
export const catalogId = (id: number) => map.get(id) ?? id;
export async function migrateCatalogIds() {
  const keys = ['hana:saved:v1', 'hana:history:v1'] as const;
  const saved = keys.map((key) => ({ key, value: browserStorage.getItem(key) }));
  const ids = new Set(curatedAnime.map((a) => a.id));
  for (const row of saved) {
    try {
      const raw = JSON.parse(row.value ?? 'null');
      const entries = Array.isArray(raw)
        ? raw
        : raw?.version === 1 && Array.isArray(raw.entries)
          ? raw.entries.map((e: { anime?: unknown }) => e.anime)
          : [];
      for (const value of entries) {
        const a = parseStoredAnime(value);
        if (a && a.id < 1000000000) ids.add(a.id);
      }
    } catch {
      /* Existing readers handle corrupted storage. */
    }
  }
  try {
    const response = await browserNetwork.json('/api/catalog/resolve-ids', {
      method: 'POST',
      body: { ids: [...ids].slice(0, 200) },
      signal: AbortSignal.timeout(1500),
    });
    const data = response as { ids?: Record<string, unknown> };
    if (!data?.ids || typeof data.ids !== 'object') return;
    for (const [old, id] of Object.entries(data.ids))
      if (ids.has(Number(old)) && Number.isSafeInteger(id) && Number(id) >= 1000000000)
        map.set(Number(old), Number(id));
    for (const row of saved) {
      if (!row.value || browserStorage.getItem(row.key) !== row.value) continue;
      try {
        const raw = JSON.parse(row.value);
        const convert = (a: unknown) => {
          const parsed = parseStoredAnime(a);
          return parsed ? { ...parsed, id: catalogId(parsed.id) } : a;
        };
        const next = Array.isArray(raw)
          ? raw.map(convert)
          : raw?.version === 1 && Array.isArray(raw.entries)
            ? {
                ...raw,
                entries: raw.entries.map((e: Record<string, unknown>) => ({
                  ...e,
                  anime: convert(e.anime),
                })),
              }
            : raw;
        const value = JSON.stringify(next);
        if (value !== row.value) {
          // Only commit after retaining the old representation for recovery.
          if (
            browserStorage.getItem(`${row.key}:before-catalog`) ||
            browserStorage.setItem(`${row.key}:before-catalog`, row.value)
          )
            browserStorage.setItem(row.key, value);
        }
      } catch {
        /* Preserve malformed data rather than rewriting it. */
      }
    }
  } catch {
    /* Offline startup retains old IDs; server supports them on later requests. */
  }
}
