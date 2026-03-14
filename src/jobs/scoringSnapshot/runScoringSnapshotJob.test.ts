import assert from 'node:assert/strict';
import test from 'node:test';

import { runScoringSnapshotJob } from './runScoringSnapshotJob.ts';
import type { QueryableDb } from '../../ingestion/types.ts';
import type { SnapshotJobConfig } from './config.ts';

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

      if (sql.includes('INSERT INTO region_scores') || sql.includes('INSERT INTO job_runs')) {
        writes.push({ sql, params });
      }

      return { rows: [{ id: 1 }] as T[] };
    },
  };

  await runScoringSnapshotJob(db, new Date('2026-01-02T00:00:00Z'));

  const scoreInsert = writes.find((write) => write.sql.includes('INSERT INTO region_scores'));
  assert.equal(Boolean(scoreInsert), true);
  const regionScoreInsert = scoreInsert as { params?: unknown[] };
  assert.equal(regionScoreInsert.params?.[3], 80);

  const factorsJson = String(regionScoreInsert.params?.[12]);
  assert.equal(factorsJson.includes('"value":80'), true);
  assert.equal(factorsJson.includes('"value":10'), false);
});

test('runScoringSnapshotJob uses injected config for normalization and health movement', async () => {
  const writes: Array<{ sql: string; params?: unknown[] }> = [];

  const config: SnapshotJobConfig = {
    lookbackHours: 72,
    alertDeltaThreshold: 10,
    alertScoreThreshold: 60,
    signalNormalization: {
      'conflict.fatalities': { max: 1000 },
    },
    subScoreSignalWeights: {
      conflictPressure: { 'conflict.fatalities': 1 },
      chokepointStress: {},
      oilShockRisk: {},
      displacementAcceleration: { 'conflict.fatalities': 1 },
      narrativeHeat: {},
    },
  };

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
              value: 100,
              event_time: '2026-01-01T00:00:00Z',
              ingested_at: '2026-01-01T00:10:00Z',
              reliability_weight: 0.9,
            },
          ] as T[],
        };
      }

      if (sql.includes('INSERT INTO region_scores')) {
        writes.push({ sql, params });
      }

      return { rows: [{ id: 1 }] as T[] };
    },
  };

  await runScoringSnapshotJob(db, new Date('2026-01-02T00:00:00Z'), config);

  const scoreInsert = writes.find((write) => write.sql.includes('INSERT INTO region_scores'));
  assert.ok(scoreInsert);
  const conflictScore = Number((scoreInsert as { params?: unknown[] }).params?.[3]);
  assert.equal(conflictScore, 10);
});
