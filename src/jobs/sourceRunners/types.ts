import type { QueryableDb } from '../../ingestion/types.ts';

export interface JsonFetcher {
  (url: string, init?: { headers?: Record<string, string> }): Promise<unknown>;
}

export interface SourceRunnerContext {
  db: QueryableDb;
  fetchedAt?: Date;
  fetchJson?: JsonFetcher;
}

export const defaultJsonFetcher: JsonFetcher = async (url, init) => {
  const response = await (globalThis as unknown as { fetch: (input: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> }).fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
};
