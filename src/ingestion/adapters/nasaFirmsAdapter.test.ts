import assert from 'node:assert/strict';
import test from 'node:test';

import { ingestNasaFirmsThermalRecords } from './nasaFirmsAdapter.ts';
import type { QueryableDb } from '../types.ts';

test('ingestNasaFirmsThermalRecords persists thermal signals', async () => {
  const inserts: Array<{ params?: unknown[] }> = [];

  const db: QueryableDb = {
    async query<T>(sql: string, params?: unknown[]) {
      if (sql.includes('SELECT id FROM data_sources WHERE name = $1')) {
        return { rows: [{ id: 21 }] as T[] };
      }
      if (sql.includes('INSERT INTO raw_events')) {
        return { rows: [{ id: 902 }] as T[] };
      }
      if (sql.includes('ST_Intersects')) return { rows: [] as T[] };
      if (sql.includes('ST_DWithin')) return { rows: [{ id: 7 }] as T[] };
      if (sql.includes('INSERT INTO normalized_signals')) {
        inserts.push({ params });
        return { rows: [] as T[] };
      }
      return { rows: [] as T[] };
    },
  };

  const stats = await ingestNasaFirmsThermalRecords(db, [{
    event_id: 'n-1',
    observed_at: '2026-02-01T04:00:00Z',
    latitude: 11.2,
    longitude: 43.1,
    confidence: 70,
    brightness: 360,
    frp: 12,
  }]);

  assert.equal(stats.recordsProcessed, 1);
  assert.equal(stats.insertedSignals, 2);
  assert.equal(inserts.length, 2);
  assert.deepEqual(inserts.map((row) => row.params?.[2]), ['thermal.anomaly_count', 'thermal.fire_activity_index']);
});
