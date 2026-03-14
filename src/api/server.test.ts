import assert from 'node:assert/strict';
import test from 'node:test';

import type { QueryableDb } from '../ingestion/types.ts';
import { createWorldWatchApiServer } from './server.ts';

test('server exposes ops endpoint routing', async () => {
  const db: QueryableDb = {
    async query<T>(sql: string) {
      if (sql.includes('FROM data_sources ds')) {
        return { rows: [] as T[] };
      }
      if (sql.includes("WHERE status IN ('failed', 'partial')")) {
        return { rows: [] as T[] };
      }
      if (sql.includes("WHERE job_type = 'cycle'")) {
        return {
          rows: [{
            id: 1,
            job_name: 'worldwatch_cycle',
            status: 'success',
            started_at: '2026-01-01T00:00:00Z',
            finished_at: '2026-01-01T00:00:10Z',
            duration_ms: 10000,
            records_processed: 5,
            error_message: null,
            metadata_json: {},
          }] as T[],
        };
      }
      return { rows: [] as T[] };
    },
  };

  const server = createWorldWatchApiServer(db);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address) {
    throw new Error('Server address unavailable');
  }
  const port = address.port;

  const response = await fetch(`http://127.0.0.1:${port}/api/ops/cycle/latest`);
  assert.equal(response.status, 200);
  const payload = (await response.json()) as { job_name: string };
  assert.equal(payload.job_name, 'worldwatch_cycle');

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});
