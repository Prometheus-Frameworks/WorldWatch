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

test('server exposes ops summary response shape', async () => {
  const db: QueryableDb = {
    async query<T>(sql: string) {
      if (sql.includes("WHERE job_type = 'cycle' AND status = 'success'")) {
        return { rows: [{ finished_at: '2026-01-01T00:10:00Z' }] as T[] };
      }
      if (sql.includes("WHERE job_type = 'cycle'")) {
        return {
          rows: [{
            id: 3,
            job_name: 'worldwatch_cycle',
            status: 'partial',
            started_at: '2026-01-01T00:00:00Z',
            finished_at: '2026-01-01T00:02:00Z',
            duration_ms: 120000,
            records_processed: 99,
            error_message: null,
            metadata_json: {},
          }] as T[],
        };
      }
      if (sql.includes('FROM data_sources ds') && sql.includes('freshness_minutes')) {
        return {
          rows: [{
            source_name: 'acled',
            freshness_minutes: 60,
            reliability_weight: 0.8,
            last_success_at: '2026-01-01T00:00:00Z',
            minutes_since_last_success: 100,
            stale: true,
          }] as T[],
        };
      }
      if (sql.includes("WHERE status IN ('failed', 'partial')")) {
        return { rows: [{ id: 1 }] as T[] };
      }
      if (sql.includes('latest_success.last_success_at')) {
        return {
          rows: [{
            source_name: 'acled',
            last_success_at: '2026-01-01T00:00:00Z',
            last_failure_at: '2026-01-01T00:01:00Z',
          }] as T[],
        };
      }
      if (sql.includes('latest_snapshot.snapshot_time')) {
        return { rows: [{ snapshot_time: '2026-01-01T00:00:00Z', alerts_generated: 2, regions_scored: 7 }] as T[] };
      }
      return { rows: [] as T[] };
    },
  };

  const server = createWorldWatchApiServer(db);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address) throw new Error('Server address unavailable');

  const response = await fetch(`http://127.0.0.1:${address.port}/api/ops/summary`);
  assert.equal(response.status, 200);
  const payload = (await response.json()) as Record<string, unknown>;

  assert.equal(payload.stale_source_count, 1);
  assert.equal(payload.recent_failure_count, 1);
  assert.equal(payload.latest_cycle_records_processed, 99);
  assert.equal(payload.latest_snapshot_alerts_generated, 2);
  assert.equal(payload.latest_snapshot_regions_scored, 7);
  assert.ok(Array.isArray(payload.sources));

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});
