import assert from 'node:assert/strict';
import test from 'node:test';

import { insertJobRun } from './jobRunLogger.ts';
import type { QueryableDb } from '../ingestion/types.ts';

test('insertJobRun inserts structured record', async () => {
  let captured: { sql: string; params?: unknown[] } | undefined;
  const db: QueryableDb = {
    async query<T>(sql: string, params?: unknown[]) {
      captured = { sql, params };
      return { rows: [{ id: 42 }] as T[] };
    },
  };

  const startedAt = new Date('2026-01-01T00:00:00Z');
  const finishedAt = new Date('2026-01-01T00:00:10Z');

  const id = await insertJobRun(db, {
    jobName: 'acled',
    jobType: 'source',
    status: 'success',
    startedAt,
    finishedAt,
    recordsProcessed: 12,
    metadata: { mappedRegions: 4 },
  });

  assert.equal(id, 42);
  assert.ok(captured?.sql.includes('INSERT INTO job_runs'));
  assert.equal(captured?.params?.[0], 'acled');
  assert.equal(captured?.params?.[1], 'source');
  assert.equal(captured?.params?.[2], 'success');
  assert.equal(captured?.params?.[5], 10000);
  assert.equal(captured?.params?.[6], 12);
});
