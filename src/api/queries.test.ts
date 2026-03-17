import assert from 'node:assert/strict';
import test from 'node:test';

import type { QueryableDb } from '../ingestion/types.ts';
import {
  getAnalystDashboard,
  getAnalystSummary,
  getLatestCycleStatus,
  getRegionGeo,
  getOpsHealth,
  getRecentCycleRuns,
  getRecentFailures,
  getRecentSourceRuns,
  getRegionDetail,
  getRegionCompare,
  getRegionSummaries,
  getSourceFreshness,
} from './queries.ts';

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
            source_quality_affected: false,
            source_quality_cue: 'Region signal quality currently healthy',
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
    'source_quality_affected',
    'source_quality_cue',
  ]);
});



test('getRegionGeo returns geometry alongside analyst summary fields', async () => {
  const db: QueryableDb = {
    async query<T>() {
      return {
        rows: [{
          slug: 'suez-canal',
          name: 'Suez Canal',
          type: 'chokepoint',
          composite_score: 55,
          status_band: 'elevated',
          confidence_band: 'medium',
          freshness_state: 'fresh',
          evidence_state: 'confirmed',
          snapshot_time: '2026-01-01T00:00:00Z',
          delta_24h: 2,
          delta_7d: 5,
          source_quality_affected: false,
          source_quality_cue: 'Region signal quality currently healthy',
          geometry: { type: 'Polygon', coordinates: [[[31.8, 29.5], [33.1, 29.5], [33.1, 31.8], [31.8, 31.8], [31.8, 29.5]]] },
        }] as T[],
      };
    },
  };

  const rows = await getRegionGeo(db);
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
    'source_quality_affected',
    'source_quality_cue',
    'geometry',
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
            factors_json: [{ signalType: 'conflict.fatalities', value: 12, normalizedValue: 82, source: 'acled', domain: 'conflictPressure', sourceReliability: 0.9, recencyMinutes: 65, movement: 'up' }],
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

      if (sql.includes('GROUP BY ds.name')) {
        return {
          rows: [{ source_name: 'acled', signal_count: 2, latest_event_time: '2026-01-01T00:00:00Z', avg_raw_value: 10, avg_reliability: 0.9 }] as T[],
        };
      }

      if (sql.includes('FROM region_scores rs')) {
        return {
          rows: [{ snapshot_time: '2026-01-01T00:00:00Z', composite_score: 75, confidence_band: 'high', delta_24h: 6, delta_7d: 10, rank_movement: 3 }] as T[],
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
  assert.equal(Array.isArray((detail as Record<string, unknown>).source_contributions), true);
  assert.equal(Array.isArray((detail as Record<string, unknown>).triage_notes), true);
  assert.equal((detail as { explainability_summary: Record<string, string> }).explainability_summary.freshness_state, 'fresh');
  assert.equal(Array.isArray((detail as { explainability_groups: Record<string, unknown> }).explainability_groups.top_contributing_factors as unknown[]), true);
  assert.equal(Array.isArray((detail as { explainability_groups: Record<string, unknown> }).explainability_groups.source_disagreement_groups as unknown[]), true);
  assert.equal(typeof (detail as { explainability_groups: { narrative_physical_divergence: Record<string, unknown> } }).explainability_groups.narrative_physical_divergence, 'object');
  const history = (detail as { history: Array<Record<string, unknown>> }).history;
  assert.equal(history[0].confidence_band, 'high');
  assert.equal(history[0].rank_movement, 3);
});

test('ops queries return expected health and failure payloads', async () => {
  const db: QueryableDb = {
    async query<T>(sql: string) {
      if (sql.includes("WHERE job_type = 'cycle'")) {
        return {
          rows: [{
            id: 11,
            job_name: 'worldwatch_cycle',
            status: 'success',
            started_at: '2026-01-01T00:00:00Z',
            finished_at: '2026-01-01T00:01:00Z',
            duration_ms: 60000,
            records_processed: 100,
            error_message: null,
            metadata_json: {},
          }] as T[],
        };
      }

      if (sql.includes('FROM data_sources ds')) {
        return {
          rows: [
            {
              source_name: 'acled',
              freshness_minutes: 120,
              reliability_weight: 0.9,
              last_success_at: '2026-01-01T00:00:00Z',
              minutes_since_last_success: 50,
              stale: false,
            },
            {
              source_name: 'imf-portwatch',
              freshness_minutes: 120,
              reliability_weight: 0.8,
              last_success_at: null,
              minutes_since_last_success: null,
              stale: true,
            },
          ] as T[],
        };
      }

      if (sql.includes("WHERE status IN ('failed', 'partial')")) {
        return {
          rows: [{
            id: 99,
            job_name: 'gdelt',
            job_type: 'source',
            status: 'failed',
            started_at: '2026-01-01T00:00:00Z',
            finished_at: '2026-01-01T00:01:00Z',
            duration_ms: 60000,
            records_processed: 9,
            error_message: 'boom',
            metadata_json: {},
          }] as T[],
        };
      }

      return { rows: [] as T[] };
    },
  };

  const latestCycle = await getLatestCycleStatus(db);
  const sourceFreshness = await getSourceFreshness(db);
  const failures = await getRecentFailures(db);
  const health = await getOpsHealth(db);

  assert.equal(latestCycle?.job_name, 'worldwatch_cycle');
  assert.equal(sourceFreshness.length, 2);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].duration_ms, 60000);
  assert.equal(failures[0].records_processed, 9);
  assert.equal(health.status, 'degraded');
  assert.deepEqual(health.stale_sources, ['imf-portwatch']);
});


test('getRecentCycleRuns shapes cycle metadata into dashboard rows', async () => {
  const db: QueryableDb = {
    async query<T>(sql: string, params?: unknown[]) {
      assert.ok(sql.includes("WHERE job_type = 'cycle'"));
      assert.equal(params?.[0], 2);
      return {
        rows: [{
          id: 12,
          status: 'partial',
          started_at: '2026-01-01T00:00:00Z',
          finished_at: '2026-01-01T00:02:00Z',
          duration_ms: 120000,
          records_processed: 75,
          metadata_json: {
            snapshotTime: '2026-01-01T00:02:00Z',
            alertsGenerated: 4,
            regionsScored: 18,
            failedJobs: [{ name: 'gdelt' }],
          },
        }] as T[],
      };
    },
  };

  const rows = await getRecentCycleRuns(db, 2);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    id: 12,
    status: 'partial',
    started_at: '2026-01-01T00:00:00Z',
    finished_at: '2026-01-01T00:02:00Z',
    duration_ms: 120000,
    records_processed: 75,
    snapshot_time: '2026-01-01T00:02:00Z',
    alerts_generated: 4,
    regions_scored: 18,
    failed_jobs: 1,
  });
});

test('getRecentSourceRuns extracts source-run metrics from metadata', async () => {
  const db: QueryableDb = {
    async query<T>(sql: string, params?: unknown[]) {
      assert.ok(sql.includes("WHERE job_type = 'source'"));
      assert.equal(params?.[0], 5);
      return {
        rows: [{
          id: 31,
          job_name: 'imf_portwatch',
          status: 'failed',
          started_at: '2026-01-01T01:00:00Z',
          finished_at: '2026-01-01T01:00:40Z',
          duration_ms: 40000,
          records_processed: 11,
          error_message: 'timeout',
          metadata_json: {
            mappedRegions: 3,
            insertedSignals: 9,
          },
        }] as T[],
      };
    },
  };

  const rows = await getRecentSourceRuns(db, 5);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    id: 31,
    source_name: 'imf-portwatch',
    status: 'failed',
    started_at: '2026-01-01T01:00:00Z',
    finished_at: '2026-01-01T01:00:40Z',
    duration_ms: 40000,
    records_processed: 11,
    mapped_regions: 3,
    inserted_signals: 9,
    error_message: 'timeout',
  });
});


test('getAnalystSummary returns card and mover aggregates for dashboard', async () => {
  const db: QueryableDb = {
    async query<T>() {
      return {
        rows: [
          {
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
          },
          {
            slug: 'horn-africa',
            name: 'Horn of Africa',
            type: 'cluster',
            composite_score: 70,
            status_band: 'high',
            confidence_band: 'high',
            freshness_state: 'fresh',
            evidence_state: 'confirmed',
            snapshot_time: '2026-01-01T00:00:00Z',
            delta_24h: -12,
            delta_7d: 4,
          },
        ] as T[],
      };
    },
  };

  const summary = await getAnalystSummary(db);
  assert.equal(summary.cards.hottest_region?.slug, 'levant');
  assert.equal(summary.cards.biggest_24h_mover?.slug, 'horn-africa');
  assert.equal(summary.cards.biggest_7d_mover?.slug, 'levant');
  assert.equal(summary.cards.stale_high_risk_count, 1);
  assert.equal(summary.cards.high_score_low_confidence_count, 1);
  assert.equal(summary.top_movers.by_24h.length, 2);
  assert.equal(summary.top_movers.by_7d.length, 2);
});

test('getAnalystDashboard includes dashboard-ready triage spotlight payload', async () => {
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
            geometry: { type: 'Polygon', coordinates: [[[30, 20], [31, 20], [31, 21], [30, 21], [30, 20]]] },
          }] as T[],
        };
      }
      if (sql.includes('FROM latest l')) {
        return {
          rows: [{
            slug: 'levant',
            name: 'Levant',
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

  const payload = await getAnalystDashboard(db);
  assert.equal(payload.regions.length, 1);
  assert.equal(payload.regions_geo.length, 1);
  assert.equal(payload.feed.length, 1);
  assert.equal(payload.triage_summary.spotlight.length, 1);
  assert.equal(payload.triage_summary.spotlight[0].slug, 'levant');
  assert.equal(payload.triage_summary.spotlight[0].notes[0]?.title, 'Top mover (24h)');
});


test('getRegionCompare returns deterministic latest-vs-previous deltas', async () => {
  const db: QueryableDb = {
    async query<T>(sql: string) {
      if (sql.includes('SELECT id FROM regions')) return { rows: [{ id: 7 }] as T[] };
      if (sql.includes('FROM region_scores rs')) {
        return {
          rows: [
            {
              snapshot_time: '2026-01-02T00:00:00Z',
              composite_score: 80,
              status_band: 'high',
              confidence_band: 'medium',
              freshness_state: 'fresh',
              evidence_state: 'confirmed',
              conflict_score: 70,
              chokepoint_score: 60,
              oil_score: 50,
              displacement_score: 40,
              narrative_score: 30,
              factors_json: [{ signalType: 'conflict.fatalities', normalizedValue: 80, source: 'acled', domain: 'conflictPressure', sourceReliability: 0.9, recencyMinutes: 20, movement: 'up' }],
            },
            {
              snapshot_time: '2026-01-01T12:00:00Z',
              composite_score: 74,
              status_band: 'elevated',
              confidence_band: 'medium',
              freshness_state: 'stale',
              evidence_state: 'partial',
              conflict_score: 65,
              chokepoint_score: 55,
              oil_score: 45,
              displacement_score: 35,
              narrative_score: 25,
              factors_json: [{ signalType: 'conflict.fatalities', normalizedValue: 70, source: 'acled', domain: 'conflictPressure', sourceReliability: 0.9, recencyMinutes: 180, movement: 'up' }],
            },
          ] as T[],
        };
      }
      return { rows: [] as T[] };
    },
  };

  const compare = await getRegionCompare(db, 'levant', 'previous');
  assert.ok(compare);
  assert.equal((compare as Record<string, unknown>).compare_mode, 'previous');
  assert.equal((compare as { deltas: { composite_score: number } }).deltas.composite_score, 6);
});
