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
    '/api/analyst/dashboard',
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

test('analyst dashboard endpoint includes triage summary payload', async () => {
  const db: QueryableDb = {
    async query<T>(sql: string) {
      if (sql.includes('ST_AsGeoJSON')) {
        return {
          rows: [{
            slug: 'levant',
            name: 'Levant',
            type: 'cluster',
            composite_score: 82,
            status_band: 'high',
            confidence_band: 'low',
            freshness_state: 'stale',
            evidence_state: 'partial',
            snapshot_time: '2026-01-01T00:00:00Z',
            delta_24h: 9,
            delta_7d: 18,
            geometry: { type: 'Polygon', coordinates: [] },
          }] as T[],
        };
      }
      return {
        rows: [{
          slug: 'levant',
          name: 'Levant',
          type: 'cluster',
          composite_score: 82,
          status_band: 'high',
          confidence_band: 'low',
          freshness_state: 'stale',
          evidence_state: 'partial',
          snapshot_time: '2026-01-01T00:00:00Z',
          delta_24h: 9,
          delta_7d: 18,
        }] as T[],
      };
    },
  };
  const server = createWorldWatchApiServer(db);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address) throw new Error('Server address unavailable');

  const response = await fetch(`http://127.0.0.1:${address.port}/api/analyst/dashboard`);
  assert.equal(response.status, 200);
  const payload = (await response.json()) as Record<string, unknown>;
  const triageSummary = payload.triage_summary as { spotlight: Array<{ notes: unknown[] }> };
  assert.ok(Array.isArray(triageSummary.spotlight));
  assert.ok(Array.isArray(triageSummary.spotlight[0]?.notes));

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
  const server = createWorldWatchApiServer(db, undefined, {
    posture: 'invite_only',
    bannerText: 'Invite-only analyst workspace',
    subtitleText: 'Approved civilian users only.',
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address) throw new Error('Server address unavailable');

  const analystResponse = await fetch(`http://127.0.0.1:${address.port}/`);
  assert.equal(analystResponse.status, 200);
  const analystHtml = await (analystResponse as unknown as { text: () => Promise<string> }).text();
  assert.ok(analystHtml.includes('WorldWatch Analyst Dashboard'));
  assert.ok(analystHtml.includes('id="analyst-layout"'));
  assert.ok(analystHtml.includes('id="analyst-map"'));
  assert.ok(analystHtml.includes("regionsGeo: '/api/regions/geo'"));
  assert.ok(analystHtml.includes("target.closest('[data-region]')"));
  assert.ok(analystHtml.includes('civilian, public-source monitoring and analysis tool'));
  assert.ok(analystHtml.includes('You may not use WorldWatch to support military targeting'));

  const opsResponse = await fetch(`http://127.0.0.1:${address.port}/ops`);
  assert.equal(opsResponse.status, 200);
  const opsHtml = await (opsResponse as unknown as { text: () => Promise<string> }).text();
  assert.ok(opsHtml.includes('WorldWatch Internal Ops Console'));
  assert.ok(opsHtml.includes('public-source monitoring and analysis only'));
  assert.ok(analystHtml.includes('Deployment posture:'));
  assert.ok(analystHtml.includes('Invite-only analyst workspace'));
  assert.ok(opsHtml.includes('Deployment posture:'));
  assert.ok(opsHtml.includes('Approved civilian users only.'));

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});




test('ops console disables manual trigger in public_read_only posture', async () => {
  const db: QueryableDb = { query: async <T>() => ({ rows: [] as T[] }) };
  const server = createWorldWatchApiServer(db, undefined, {
    posture: 'public_read_only',
    bannerText: 'Public read-only posture',
    subtitleText: 'Read-only visibility for civilian public-source monitoring outputs.',
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address) throw new Error('Server address unavailable');

  const response = await fetch(`http://127.0.0.1:${address.port}/ops`);
  assert.equal(response.status, 200);
  const html = await (response as unknown as { text: () => Promise<string> }).text();

  assert.ok(html.includes('id="trigger"'));
  assert.ok(html.includes('data-manual-trigger-disabled="true"'));
  assert.ok(html.includes('disabled aria-disabled="true"'));
  assert.ok(html.includes('Manual cycle trigger is disabled in public_read_only posture.'));

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

test('manual cycle trigger route is blocked in public_read_only posture', async () => {
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
  }, {
    posture: 'public_read_only',
    bannerText: 'Public read-only posture',
    subtitleText: 'Read-only visibility for civilian public-source monitoring outputs.',
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address) throw new Error('Server address unavailable');

  const response = await fetch(`http://127.0.0.1:${address.port}/api/ops/cycle/run`, { method: 'POST' });
  assert.equal(response.status, 403);

  const payload = (await response.json()) as Record<string, unknown>;
  assert.equal(payload.error, 'posture_read_only');
  assert.equal(payload.message, 'Manual cycle trigger is disabled in public_read_only posture.');

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

test('server serves /about policy route with canonical usage statements', async () => {
  const db: QueryableDb = { query: async <T>() => ({ rows: [] as T[] }) };
  const server = createWorldWatchApiServer(db);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address) throw new Error('Server address unavailable');

  const response = await fetch(`http://127.0.0.1:${address.port}/about`);
  assert.equal(response.status, 200);
  const html = await (response as unknown as { text: () => Promise<string> }).text();

  assert.ok(html.includes('WorldWatch About / Usage / Terms'));
  assert.ok(html.includes('civilian, public-source monitoring and analysis tool'));
  assert.ok(html.includes('You may not use WorldWatch to support military targeting'));

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

test('manual cycle trigger returns cycle payload on success in internal posture', async () => {
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
  }, {
    posture: 'internal',
    bannerText: 'Internal-only workspace',
    subtitleText: 'For internal analyst and operations workflows only.',
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




test('server exposes analyst geo endpoint shape for internal map rendering', async () => {
  const db: QueryableDb = {
    async query<T>(sql: string) {
      if (sql.includes('ST_AsGeoJSON')) {
        return {
          rows: [{
            slug: 'suez-canal',
            name: 'Suez Canal',
            type: 'chokepoint',
            composite_score: 64,
            status_band: 'high',
            confidence_band: 'high',
            freshness_state: 'fresh',
            evidence_state: 'confirmed',
            snapshot_time: '2026-01-01T00:00:00Z',
            delta_24h: 4,
            delta_7d: 7,
            geometry: { type: 'Polygon', coordinates: [] },
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

  const response = await fetch(`http://127.0.0.1:${address.port}/api/regions/geo`);
  assert.equal(response.status, 200);
  const payload = (await response.json()) as Array<Record<string, unknown>>;
  assert.equal(payload[0].slug, 'suez-canal');
  assert.equal(typeof payload[0].geometry, 'object');

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


test('analyst dashboard endpoint returns consolidated payload for client bootstrap', async () => {
  const db: QueryableDb = {
    async query<T>(sql: string) {
      if (sql.includes('ST_AsGeoJSON')) return { rows: [{ slug: 'levant', name: 'Levant', type: 'region', composite_score: 70, status_band: 'high', confidence_band: 'medium', freshness_state: 'fresh', evidence_state: 'mixed', snapshot_time: '2026-01-01T00:00:00Z', delta_24h: 2, delta_7d: 5, geometry: { type: 'Polygon', coordinates: [] } }] as T[] };
      if (sql.includes('ORDER BY rs.composite_score DESC, r.slug ASC')) return { rows: [{ slug: 'levant', name: 'Levant', type: 'region', composite_score: 70, status_band: 'high', confidence_band: 'medium', freshness_state: 'fresh', evidence_state: 'mixed', snapshot_time: '2026-01-01T00:00:00Z', delta_24h: 2, delta_7d: 5 }] as T[] };
      if (sql.includes('FROM alerts_feed')) return { rows: [{ slug: 'levant', name: 'Levant', composite_score: 70, status_band: 'high', confidence_band: 'medium', freshness_state: 'fresh', evidence_state: 'mixed', snapshot_time: '2026-01-01T00:00:00Z', delta_24h: 2, delta_7d: 5 }] as T[] };
      if (sql.includes('stale_high_risk_count')) return { rows: [{ stale_high_risk_count: 1, high_score_low_confidence_count: 0 }] as T[] };
      if (sql.includes('biggest_24h_mover')) return { rows: [] as T[] };
      return { rows: [] as T[] };
    },
  };

  const server = createWorldWatchApiServer(db);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address) throw new Error('Server address unavailable');

  const response = await fetch(`http://127.0.0.1:${address.port}/api/analyst/dashboard`);
  assert.equal(response.status, 200);
  const payload = (await response.json()) as Record<string, unknown>;

  assert.ok(Array.isArray(payload.regions));
  assert.ok(Array.isArray(payload.regions_geo));
  assert.ok(Array.isArray(payload.feed));
  assert.equal(typeof payload.summary, 'object');

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});
