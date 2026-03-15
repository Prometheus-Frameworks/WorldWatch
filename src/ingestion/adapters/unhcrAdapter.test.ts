import assert from 'node:assert/strict';
import test from 'node:test';

import { ingestUnhcrDisplacementRecords } from './unhcrAdapter.ts';
import type { QueryableDb } from '../types.ts';

test('ingestUnhcrDisplacementRecords persists displacement signals', async () => {
  const inserts: Array<{ params?: unknown[] }> = [];

  const db: QueryableDb = {
    async query<T>(sql: string, params?: unknown[]) {
      if (sql.includes('SELECT id FROM data_sources WHERE name = $1')) {
        return { rows: [{ id: 20 }] as T[] };
      }
      if (sql.includes('INSERT INTO raw_events')) {
        return { rows: [{ id: 901 }] as T[] };
      }
      if (sql.includes('ST_Intersects')) return { rows: [{ id: 4 }] as T[] };
      if (sql.includes('INSERT INTO normalized_signals')) {
        inserts.push({ params });
        return { rows: [] as T[] };
      }
      return { rows: [] as T[] };
    },
  };

  const stats = await ingestUnhcrDisplacementRecords(db, [{
    record_id: 'u-1',
    observed_at: '2026-02-01T00:00:00Z',
    latitude: 31.5,
    longitude: 35.1,
    displaced_total: 10000,
    displacement_delta: 400,
  }]);

  assert.equal(stats.recordsProcessed, 1);
  assert.equal(stats.insertedSignals, 2);
  assert.equal(inserts.length, 2);
  assert.deepEqual(inserts.map((row) => row.params?.[2]), ['displacement.delta', 'displacement.acceleration']);
});
