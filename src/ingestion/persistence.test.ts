import assert from 'node:assert/strict';
import test from 'node:test';

import { persistNormalizedSignals } from './persistence.ts';
import type { QueryableDb } from './types.ts';

test('persistNormalizedSignals upserts duplicate normalized signal keys', async () => {
  const statements: string[] = [];

  const db: QueryableDb = {
    async query<T>(sql: string): Promise<{ rows: T[] }> {
      statements.push(sql);
      return { rows: [] as T[] };
    },
  };

  await persistNormalizedSignals(db, [
    {
      regionId: 1,
      sourceId: 2,
      signalType: 'conflict.fatalities',
      value: 11,
      unit: 'people',
      eventTime: new Date('2026-01-02T00:00:00Z'),
      metadataJson: { k: 'v' },
    },
  ]);

  const insertSql = statements.find((statement) => statement.includes('INSERT INTO normalized_signals'));
  assert.equal(Boolean(insertSql), true);
  assert.equal(insertSql?.includes('ON CONFLICT (region_id, source_id, signal_type, event_time) DO UPDATE'), true);
  assert.equal(insertSql?.includes('ingested_at = NOW()'), true);
});
