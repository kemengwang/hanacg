import type { KeyValueStorage, NetworkClient } from '@hanacg/platform';

export const browserStorage: KeyValueStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
};
export const browserNetwork: NetworkClient = {
  async json(url, options) {
    const timeout = AbortSignal.timeout(url.startsWith('/api/') ? 35_000 : 10_000);
    const signal = options?.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    const response = await fetch(url, {
      method: options?.method ?? 'GET',
      signal,
      credentials: 'omit',
      ...(options?.body !== undefined
        ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(options.body) }
        : {}),
    });
    if (!response.ok) throw new Error(`Metadata request failed: ${response.status}`);
    return response.json() as Promise<unknown>;
  },
};
