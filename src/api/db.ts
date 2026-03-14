import type { QueryableDb } from '../ingestion/types.ts';

export interface DbBootstrapOptions {
  query: QueryableDb['query'];
}

export function createDb(options: DbBootstrapOptions): QueryableDb {
  return {
    query: options.query,
  };
}
