import assert from 'node:assert/strict';
import test from 'node:test';

import { runScoringSnapshotJob } from './runScoringSnapshotJob.ts';
import type { QueryableDb } from '../../ingestion/types.ts';

test('runScoringSnapshotJob uses latest signal per type inside lookback window', async () => {
  const writes: Array<{ sql: string; params?: unknown[] }> = [];

  const db: QueryableDb = {
    async query<T>(sql: string, params?: unknown[]) {
      if (sql.includes('SELECT id, slug, name FROM regions')) {
        return { rows: [{ id: 1, slug: 'levant', name: 'Levant' }] as T[] };
      }

      if (sql.includes('FROM normalized_signals ns')) {
        return {
          rows: [
            {
              region_id: 1,
              source_name: 'acled',
              signal_type: 'conflict.fatalities',
              value: 10,
              event_time: '2026-01-01T00:00:00Z',
              ingested_at: '2026-01-01T00:10:00Z',
              reliability_weight: 0.9,
            },
            {
              region_id: 1,
              source_name: 'acled',
              signal_type: 'conflict.fatalities',
              value: 80,
              event_time: '2026-01-01T01:00:00Z',
              ingested_at: '2026-01-01T01:10:00Z',
              reliability_weight: 0.9,
            },
          ] as T[],
        };
      }

      if (sql.includes('INSERT INTO region_scores')) {
        writes.push({ sql, params });
      }

      return { rows: [] as T[] };
    },
  };

  await runScoringSnapshotJob(db, new Date('2026-01-02T00:00:00Z'));

  const scoreInsert = writes.find((write) => write.sql.includes('INSERT INTO region_scores'));
  assert.equal(Boolean(scoreInsert), true);
  const regionScoreInsert = scoreInsert as { params?: unknown[] };
  assert.equal(regionScoreInsert.params?.[3], 80);

  const factorsJson = String(regionScoreInsert.params?.[12]);
  assert.equal(factorsJson.includes('\"value\":80'), true);
  assert.equal(factorsJson.includes('\"value\":10'), false);
});
