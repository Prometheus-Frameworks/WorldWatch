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

test('ops console data endpoints are fetch-compatible for the console', async () => {
  const db: QueryableDb = {
    async query<T>(sql: string) {
      if (sql.includes('FROM data_sources ds')) return { rows: [] as T[] };
      if (sql.includes("WHERE status IN ('failed', 'partial')")) return { rows: [] as T[] };
      if (sql.includes("WHERE job_type = 'cycle'")) return { rows: [] as T[] };
      return { rows: [] as T[] };
    },
  };
  const server = createWorldWatchApiServer(db);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address) throw new Error('Server address unavailable');

  const endpoints = [
    '/api/ops/summary',
    '/api/analyst/summary',
    '/api/ops/cycle/latest',
    '/api/ops/cycles',
    '/api/ops/sources/runs',
    '/api/ops/source-freshness',
    '/api/ops/failures',
  ];

  for (const endpoint of endpoints) {
    const response = await fetch(`http://127.0.0.1:${address.port}${endpoint}`);
    assert.ok(response.status === 200 || response.status === 404);
    await response.json();
  }

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

test('manual cycle trigger rejects overlap while run is in-flight', async () => {
  const db: QueryableDb = { query: async <T>() => ({ rows: [] as T[] }) };

  let releaseRun: () => void = () => {};
  const server = createWorldWatchApiServer(db, {
    runCycle: async () => {
      await new Promise<void>((resolve) => {
        releaseRun = resolve;
      });
      return {
        status: 'success',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 1,
        jobs: [],
        totalRecordsProcessed: 1,
        sourceRecordsProcessed: { acled: 1 },
        snapshotRowsWritten: 1,
        alertsGenerated: 0,
        regionsScored: 1,
      };
    },
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address) throw new Error('Server address unavailable');

  const firstRequest = fetch(`http://127.0.0.1:${address.port}/api/ops/cycle/run`, { method: 'POST' });
  await new Promise<void>((resolve) => setImmediate(resolve));

  const overlap = await fetch(`http://127.0.0.1:${address.port}/api/ops/cycle/run`, { method: 'POST' });
  assert.equal(overlap.status, 409);

  releaseRun();
  const firstResponse = await firstRequest;
  assert.equal(firstResponse.status, 200);

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});




test('server serves analyst dashboard at root and ops at /ops', async () => {
  const db: QueryableDb = { query: async <T>() => ({ rows: [] as T[] }) };
  const server = createWorldWatchApiServer(db);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address) throw new Error('Server address unavailable');

  const analystResponse = await fetch(`http://127.0.0.1:${address.port}/`);
  assert.equal(analystResponse.status, 200);
  const analystHtml = await (analystResponse as unknown as { text: () => Promise<string> }).text();
  assert.ok(analystHtml.includes('WorldWatch Analyst Dashboard'));

  const opsResponse = await fetch(`http://127.0.0.1:${address.port}/ops`);
  assert.equal(opsResponse.status, 200);
  const opsHtml = await (opsResponse as unknown as { text: () => Promise<string> }).text();
  assert.ok(opsHtml.includes('WorldWatch Internal Ops Console'));

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

test('manual cycle trigger returns cycle payload on success', async () => {
  const db: QueryableDb = { query: async <T>() => ({ rows: [] as T[] }) };
  const server = createWorldWatchApiServer(db, {
    runCycle: async () => ({
      status: 'success',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:00:10Z',
      durationMs: 10000,
      jobs: [],
      totalRecordsProcessed: 22,
      sourceRecordsProcessed: { acled: 10, gdelt: 12 },
      snapshotRowsWritten: 9,
      alertsGenerated: 3,
      regionsScored: 9,
    }),
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address) throw new Error('Server address unavailable');

  const response = await fetch(`http://127.0.0.1:${address.port}/api/ops/cycle/run`, { method: 'POST' });
  assert.equal(response.status, 200);
  const payload = (await response.json()) as Record<string, unknown>;
  assert.equal(payload.state, 'completed');

  const cycle = payload.cycle as Record<string, unknown>;
  assert.equal(cycle.totalRecordsProcessed, 22);
  assert.equal(cycle.alertsGenerated, 3);

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

test('ops history endpoints return dashboard-shaped rows', async () => {
  const db: QueryableDb = {
    async query<T>(sql: string) {
      if (sql.includes("WHERE job_type = 'cycle'")) {
        return {
          rows: [{
            id: 41,
            status: 'success',
            started_at: '2026-01-01T00:00:00Z',
            finished_at: '2026-01-01T00:01:00Z',
            duration_ms: 60000,
            records_processed: 40,
            metadata_json: { snapshotTime: '2026-01-01T00:01:00Z', alertsGenerated: 2, regionsScored: 7, failedJobs: [] },
          }] as T[],
        };
      }
      if (sql.includes("WHERE job_type = 'source'")) {
        return {
          rows: [{
            id: 42,
            job_name: 'imf_portwatch',
            status: 'failed',
            started_at: '2026-01-01T00:02:00Z',
            finished_at: '2026-01-01T00:02:20Z',
            duration_ms: 20000,
            records_processed: 9,
            error_message: 'boom',
            metadata_json: { mappedRegions: 3, insertedSignals: 6 },
          }] as T[],
        };
      }
      return { rows: [] as T[] };
    },
  };

  const server = createWorldWatchApiServer(db);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address) throw new Error('Server address unavailable');

  const cycleResponse = await fetch(`http://127.0.0.1:${address.port}/api/ops/cycles?limit=1`);
  assert.equal(cycleResponse.status, 200);
  const cyclePayload = (await cycleResponse.json()) as Array<Record<string, unknown>>;
  assert.equal(cyclePayload[0].alerts_generated, 2);

  const sourceResponse = await fetch(`http://127.0.0.1:${address.port}/api/ops/sources/runs?limit=1`);
  assert.equal(sourceResponse.status, 200);
  const sourcePayload = (await sourceResponse.json()) as Array<Record<string, unknown>>;
  assert.equal(sourcePayload[0].source_name, 'imf-portwatch');
  assert.equal(sourcePayload[0].mapped_regions, 3);

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});


test('server exposes analyst summary endpoint', async () => {
  const db: QueryableDb = {
    async query<T>(sql: string) {
      if (sql.includes('FROM regions r')) {
        return {
          rows: [{
            slug: 'levant',
            name: 'Levant',
            type: 'cluster',
            composite_score: 80,
            status_band: 'high',
            confidence_band: 'low',
            freshness_state: 'stale',
            evidence_state: 'partial',
            snapshot_time: '2026-01-01T00:00:00Z',
            delta_24h: 6,
            delta_7d: 12,
          }] as T[],
        };
      }
      return { rows: [] as T[] };
    },
  };

  const server = createWorldWatchApiServer(db);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address) throw new Error('Server address unavailable');

  const response = await fetch(`http://127.0.0.1:${address.port}/api/analyst/summary`);
  assert.equal(response.status, 200);
  const payload = (await response.json()) as Record<string, unknown>;
  assert.equal(typeof payload.cards, 'object');

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});
