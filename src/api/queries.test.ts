import assert from 'node:assert/strict';
import test from 'node:test';

import type { QueryableDb } from '../ingestion/types.ts';
import { getRegionDetail, getRegionSummaries } from './queries.ts';

test('getRegionSummaries returns latest summary shape', async () => {
  const db: QueryableDb = {
    async query<T>() {
      return {
        rows: [
          {
            slug: 'levant',
            name: 'Levant',
            type: 'cluster',
            composite_score: 62,
            status_band: 'high',
            confidence_band: 'medium',
            freshness_state: 'fresh',
            evidence_state: 'confirmed',
            snapshot_time: '2026-01-01T00:00:00Z',
            delta_24h: 8,
            delta_7d: 11,
          },
        ] as T[],
      };
    },
  };

  const rows = await getRegionSummaries(db);
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]), [
    'slug',
    'name',
    'type',
    'composite_score',
    'status_band',
    'confidence_band',
    'freshness_state',
    'evidence_state',
    'snapshot_time',
    'delta_24h',
    'delta_7d',
  ]);
});

test('getRegionDetail assembles score, deltas, recent signals and history', async () => {
  const db: QueryableDb = {
    async query<T>(sql: string) {
      if (sql.includes('FROM regions r') && sql.includes('WHERE r.slug')) {
        return {
          rows: [{
            id: 1,
            slug: 'levant',
            name: 'Levant',
            type: 'cluster',
            composite_score: 75,
            status_band: 'high',
            confidence_band: 'high',
            freshness_state: 'fresh',
            evidence_state: 'confirmed',
            factors_json: [{ signalType: 'conflict.fatalities', value: 12 }],
            second_order_effects_json: [],
            snapshot_time: '2026-01-01T00:00:00Z',
            delta_24h: 6,
            delta_7d: 10,
          }] as T[],
        };
      }

      if (sql.includes('FROM normalized_signals ns')) {
        return {
          rows: [{ signal_type: 'conflict.fatalities', value: 12, unit: 'people' }] as T[],
        };
      }

      if (sql.includes('FROM region_scores rs')) {
        return {
          rows: [{ snapshot_time: '2026-01-01T00:00:00Z', composite_score: 75, delta_24h: 6, delta_7d: 10 }] as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };

  const detail = await getRegionDetail(db, 'levant');
  assert.ok(detail);
  assert.equal((detail as Record<string, unknown>).latest_score !== undefined, true);
  assert.equal(Array.isArray((detail as Record<string, unknown>).recent_signals), true);
  assert.equal(Array.isArray((detail as Record<string, unknown>).history), true);
});
