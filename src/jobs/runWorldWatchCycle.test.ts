import assert from 'node:assert/strict';
import test from 'node:test';

import { runWorldWatchCycle } from './runWorldWatchCycle.ts';
import type { QueryableDb } from '../ingestion/types.ts';

test('runWorldWatchCycle continues on source failure and still snapshots', async () => {
  const jobRunInserts: Array<{ params?: unknown[] }> = [];

  const payloads: Record<string, unknown> = {
    'https://acled.test': [{ event_id_cnty: 'a-1', event_date: '2026-01-01T00:00:00Z' }],
    'https://gdelt.test': [{ GLOBALEVENTID: 'g-1', SQLDATE: '20260101' }],
    'https://imf.test': [{ observation_id: 'p-1', observed_at: '2026-01-01T00:00:00Z' }],
    'https://eia.test': [{ series_id: 's1', period: '2026-01-01T00:00:00Z', value: 10 }],
    'https://unhcr.test': [{ record_id: 'u-1', observed_at: '2026-01-01T00:00:00Z' }],
    'https://nasa.test': [{ event_id: 'n-1', observed_at: '2026-01-01T00:00:00Z' }],
  };

  const db: QueryableDb = {
    async query<T>(sql: string, params?: unknown[]) {
      if (sql.includes('SELECT id FROM data_sources WHERE name = $1')) {
        const sourceName = String(params?.[0]);
        const ids: Record<string, number> = { acled: 1, gdelt: 2, imf_portwatch: 3, eia: 4, unhcr: 5, 'nasa-firms': 6 };
        return { rows: [{ id: ids[sourceName] }] as T[] };
      }
      if (sql.includes('INSERT INTO raw_events')) return { rows: [{ id: 1 }] as T[] };
      if (sql.includes('SELECT id FROM regions WHERE ST_DWithin') || sql.includes('SELECT id FROM regions WHERE LOWER')) {
        return { rows: [{ id: 100 }] as T[] };
      }
      if (sql.includes('SELECT id, slug, name FROM regions')) {
        return { rows: [{ id: 100, slug: 'levant', name: 'Levant' }] as T[] };
      }
      if (sql.includes('FROM normalized_signals ns')) {
        return {
          rows: [{
            region_id: 100,
            source_name: 'acled',
            signal_type: 'conflict.fatalities',
            value: 50,
            event_time: '2026-01-01T00:00:00Z',
            ingested_at: '2026-01-01T00:01:00Z',
            reliability_weight: 0.8,
          }] as T[],
        };
      }
      if (sql.includes('INSERT INTO job_runs')) {
        jobRunInserts.push({ params });
        return { rows: [{ id: 1 }] as T[] };
      }

      return { rows: [] as T[] };
    },
  };

  const result = await runWorldWatchCycle({
    db,
    acled: { url: 'https://acled.test' },
    gdelt: { url: 'https://gdelt.test' },
    imfPortWatch: { url: 'https://imf.test' },
    eia: { url: 'https://eia.test' },
    unhcr: { url: 'https://unhcr.test' },
    nasaFirms: { url: 'https://nasa.test' },
    fetchJson: async (url) => {
      if (url.includes('gdelt')) throw new Error('gdelt failed');
      return payloads[url];
    },
  });

  assert.equal(result.status, 'partial');
  assert.equal(Boolean(result.snapshotTime), true);
  assert.equal(result.jobs.some((job) => job.jobName === 'gdelt' && !job.success), true);
  assert.equal(result.jobs.some((job) => job.jobName === 'scoring_snapshot' && job.success), true);

  assert.equal(result.totalRecordsProcessed, 5);
  assert.deepEqual(result.sourceRecordsProcessed, {
    acled: 1,
    gdelt: 0,
    imf_portwatch: 1,
    eia: 1,
    unhcr: 1,
    nasa_firms: 1,
  });
  assert.equal(result.snapshotRowsWritten, 1);
  assert.equal(result.alertsGenerated, 0);
  assert.equal(result.regionsScored, 1);
  assert.equal(jobRunInserts.length >= 5, true);
});
