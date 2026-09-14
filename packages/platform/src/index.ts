export interface KeyValueStorage {
  getItem(key: string): string | null;
  /** False means persistence is unavailable; the UI can still use memory. */
  setItem(key: string, value: string): boolean;
}
export interface NetworkClient {
  json(
    url: string,
    options?: { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal },
  ): Promise<unknown>;
}
export interface MediaResource {
  url: string;
  mimeType?: string;
  headers?: Readonly<Record<string, string>>;
}
