import assert from 'node:assert/strict';
import test from 'node:test';

import { runNasaFirmsSourceJob } from './runNasaFirmsSourceJob.ts';
import { runUnhcrSourceJob } from './runUnhcrSourceJob.ts';
import type { QueryableDb } from '../../ingestion/types.ts';

function buildDb(): QueryableDb {
  return {
    async query<T>(sql: string, params?: unknown[]) {
      if (sql.includes('SELECT id FROM data_sources WHERE name = $1')) {
        const sourceName = String(params?.[0]);
        const ids: Record<string, number> = { unhcr: 5, 'nasa-firms': 6 };
        return { rows: [{ id: ids[sourceName] }] as T[] };
      }
      if (sql.includes('INSERT INTO raw_events')) return { rows: [{ id: 1 }] as T[] };
      if (sql.includes('ST_Intersects')) return { rows: [{ id: 101 }] as T[] };
      if (sql.includes('INSERT INTO job_runs')) return { rows: [{ id: 1 }] as T[] };
      return { rows: [] as T[] };
    },
  };
}

test('runUnhcrSourceJob normalizes records payload and ingests', async () => {
  const result = await runUnhcrSourceJob({
    db: buildDb(),
    url: 'https://unhcr.test',
    fetchJson: async () => ({
      records: [
        {
          id: 'u-1',
          report_date: '2026-01-01T00:00:00Z',
          country_name: 'Sudan',
          new_displacements: 320,
          total_displaced: 5000,
          latitude: 15,
          longitude: 32,
        },
      ],
    }),
  });

  assert.equal(result.recordsProcessed, 1);
  assert.equal(result.insertedSignals, 2);
});

test('runNasaFirmsSourceJob normalizes FIRMS fields and ingests', async () => {
  const result = await runNasaFirmsSourceJob({
    db: buildDb(),
    url: 'https://nasa.test',
    fetchJson: async () => ({
      data: [
        {
          acq_date: '2026-01-01',
          acq_time: '1230',
          latitude: 10,
          longitude: 40,
          confidence: 80,
          bright_ti4: 350,
          frp: 15,
        },
      ],
    }),
  });

  assert.equal(result.recordsProcessed, 1);
  assert.equal(result.insertedSignals, 2);
});
