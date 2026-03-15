import type { QueryableDb } from '../ingestion/types.ts';

export interface RegionSummary {
  slug: string;
  name: string;
  type: string;
  composite_score: number;
  status_band: string;
  confidence_band: string;
  freshness_state: string;
  evidence_state: string;
  snapshot_time: string;
  delta_24h: number;
  delta_7d: number;
}

export interface LatestCycleStatus {
  id: number;
  job_name: string;
  status: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  records_processed: number;
  error_message: string | null;
  metadata_json: Record<string, unknown>;
}

export interface SourceFreshnessRow {
  source_name: string;
  freshness_minutes: number;
  reliability_weight: number;
  last_success_at: string | null;
  minutes_since_last_success: number | null;
  stale: boolean;
}

export interface RecentFailureRow {
  id: number;
  job_name: string;
  job_type: string;
  status: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  records_processed: number;
  error_message: string | null;
  metadata_json: Record<string, unknown>;
}

export interface CycleRunHistoryRow {
  id: number;
  status: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  records_processed: number;
  snapshot_time: string | null;
  alerts_generated: number;
  regions_scored: number;
  failed_jobs: number;
}

export interface SourceRunHistoryRow {
  id: number;
  source_name: string;
  status: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  records_processed: number;
  mapped_regions: number;
  inserted_signals: number;
  error_message: string | null;
}


export interface OpsSummary {
  latest_cycle: LatestCycleStatus | null;
  last_successful_cycle_at: string | null;
  stale_source_count: number;
  stale_sources: string[];
  recent_failure_count: number;
  sources: Array<{
    source_name: string;
    last_success_at: string | null;
    last_failure_at: string | null;
    stale: boolean;
  }>;
  latest_cycle_records_processed: number;
  latest_snapshot_alerts_generated: number;
  latest_snapshot_regions_scored: number;
}

export interface AnalystSummary {
  cards: {
    hottest_region: RegionSummary | null;
    biggest_24h_mover: RegionSummary | null;
    biggest_7d_mover: RegionSummary | null;
    stale_high_risk_count: number;
    high_score_low_confidence_count: number;
  };
  top_movers: {
    by_24h: RegionSummary[];
    by_7d: RegionSummary[];
  };
}
export async function getRegionSummaries(db: QueryableDb): Promise<RegionSummary[]> {
  const result = await db.query<RegionSummary>(
    `SELECT r.slug,
            r.name,
            r.type::text as type,
            rs.composite_score,
            rs.status_band::text as status_band,
            rs.confidence_band::text as confidence_band,
            rs.freshness_state::text as freshness_state,
            rs.evidence_state::text as evidence_state,
            rs.snapshot_time,
            COALESCE(rd.delta_24h, 0) AS delta_24h,
            COALESCE(rd.delta_7d, 0) AS delta_7d
      FROM regions r
      JOIN LATERAL (
        SELECT *
          FROM region_scores
         WHERE region_id = r.id
         ORDER BY snapshot_time DESC
         LIMIT 1
      ) rs ON true
      LEFT JOIN region_deltas rd
        ON rd.region_id = r.id
       AND rd.snapshot_time = rs.snapshot_time
      ORDER BY rs.composite_score DESC, r.slug ASC`,
  );

  return result.rows;
}

export async function getRegionDetail(db: QueryableDb, slug: string, historyLimit = 30, signalLimit = 25): Promise<Record<string, unknown> | null> {
  const latest = await db.query<Record<string, unknown>>(
    `SELECT r.id,
            r.slug,
            r.name,
            r.type::text as type,
            rs.composite_score,
            rs.status_band::text as status_band,
            rs.confidence_band::text as confidence_band,
            rs.freshness_state::text as freshness_state,
            rs.evidence_state::text as evidence_state,
            rs.conflict_score,
            rs.chokepoint_score,
            rs.oil_score,
            rs.displacement_score,
            rs.narrative_score,
            rs.factors_json,
            rs.second_order_effects_json,
            rs.snapshot_time,
            COALESCE(rd.delta_24h, 0) AS delta_24h,
            COALESCE(rd.delta_7d, 0) AS delta_7d
      FROM regions r
      JOIN LATERAL (
        SELECT *
          FROM region_scores
         WHERE region_id = r.id
         ORDER BY snapshot_time DESC
         LIMIT 1
      ) rs ON true
      LEFT JOIN region_deltas rd ON rd.region_id = r.id AND rd.snapshot_time = rs.snapshot_time
     WHERE r.slug = $1
     LIMIT 1`,
    [slug],
  );

  const head = latest.rows[0];
  if (!head) return null;

  const regionId = Number(head.id);

  const recentSignals = await db.query<Record<string, unknown>>(
    `SELECT ns.signal_type,
            ns.value,
            ns.unit,
            ns.event_time,
            ds.name AS source_name,
            ns.metadata_json
      FROM normalized_signals ns
      JOIN data_sources ds ON ds.id = ns.source_id
     WHERE ns.region_id = $1
       AND ns.event_time >= $2
     ORDER BY ns.event_time DESC
     LIMIT $3`,
    [regionId, new Date(Date.now() - 48 * 3600 * 1000).toISOString(), signalLimit],
  );

  const history = await db.query<Record<string, unknown>>(
    `SELECT rs.snapshot_time,
            rs.composite_score,
            rs.status_band::text as status_band,
            COALESCE(rd.delta_24h, 0) as delta_24h,
            COALESCE(rd.delta_7d, 0) as delta_7d
       FROM region_scores rs
       LEFT JOIN region_deltas rd
         ON rd.region_id = rs.region_id
        AND rd.snapshot_time = rs.snapshot_time
      WHERE rs.region_id = $1
      ORDER BY rs.snapshot_time DESC
      LIMIT $2`,
    [regionId, historyLimit],
  );

  return {
    latest_score: {
      slug: head.slug,
      name: head.name,
      type: head.type,
      composite_score: head.composite_score,
      status_band: head.status_band,
      confidence_band: head.confidence_band,
      freshness_state: head.freshness_state,
      evidence_state: head.evidence_state,
      snapshot_time: head.snapshot_time,
      conflict_score: head.conflict_score,
      chokepoint_score: head.chokepoint_score,
      oil_score: head.oil_score,
      displacement_score: head.displacement_score,
      narrative_score: head.narrative_score,
    },
    factor_payload: head.factors_json,
    second_order_effects: head.second_order_effects_json,
    latest_delta: {
      delta_24h: head.delta_24h,
      delta_7d: head.delta_7d,
    },
    recent_signals: recentSignals.rows,
    history: history.rows,
  };
}

export async function getFeed(db: QueryableDb, limit = 50): Promise<Record<string, unknown>[]> {
  const result = await db.query<Record<string, unknown>>(
    `WITH latest AS (
       SELECT DISTINCT ON (region_id)
              region_id,
              snapshot_time,
              delta_24h,
              delta_7d
         FROM region_deltas
        ORDER BY region_id, snapshot_time DESC
     )
     SELECT r.slug,
            r.name,
            rs.composite_score,
            rs.status_band::text as status_band,
            rs.confidence_band::text as confidence_band,
            rs.freshness_state::text as freshness_state,
            rs.evidence_state::text as evidence_state,
            l.snapshot_time,
            l.delta_24h,
            l.delta_7d
       FROM latest l
       JOIN regions r ON r.id = l.region_id
       JOIN region_scores rs ON rs.region_id = l.region_id AND rs.snapshot_time = l.snapshot_time
      ORDER BY ABS(l.delta_24h) DESC, rs.composite_score DESC
      LIMIT $1`,
    [limit],
  );

  return result.rows;
}

export async function getRegionHistory(db: QueryableDb, slug: string, limit = 100): Promise<Record<string, unknown>[] | null> {
  const region = await db.query<{ id: number }>('SELECT id FROM regions WHERE slug = $1 LIMIT 1', [slug]);
  const regionId = region.rows[0]?.id;
  if (!regionId) return null;

  const result = await db.query<Record<string, unknown>>(
    `SELECT rs.snapshot_time,
            rs.composite_score,
            rs.status_band::text as status_band,
            rs.confidence_band::text as confidence_band,
            COALESCE(rd.delta_24h, 0) AS delta_24h,
            COALESCE(rd.delta_7d, 0) AS delta_7d,
            COALESCE(rd.rank_movement, 0) AS rank_movement
      FROM region_scores rs
      LEFT JOIN region_deltas rd
        ON rd.region_id = rs.region_id
       AND rd.snapshot_time = rs.snapshot_time
     WHERE rs.region_id = $1
     ORDER BY rs.snapshot_time DESC
     LIMIT $2`,
    [regionId, limit],
  );

  return result.rows;
}

export async function getAnalystSummary(db: QueryableDb): Promise<AnalystSummary> {
  const regions = await getRegionSummaries(db);

  const hottest = [...regions].sort((a, b) => b.composite_score - a.composite_score)[0] ?? null;
  const by24h = [...regions].sort((a, b) => Math.abs(b.delta_24h) - Math.abs(a.delta_24h));
  const by7d = [...regions].sort((a, b) => Math.abs(b.delta_7d) - Math.abs(a.delta_7d));

  return {
    cards: {
      hottest_region: hottest,
      biggest_24h_mover: by24h[0] ?? null,
      biggest_7d_mover: by7d[0] ?? null,
      stale_high_risk_count: regions.filter((row) => row.status_band === 'high' && row.freshness_state !== 'fresh').length,
      high_score_low_confidence_count: regions.filter((row) => row.status_band === 'high' && row.confidence_band === 'low').length,
    },
    top_movers: {
      by_24h: by24h.slice(0, 5),
      by_7d: by7d.slice(0, 5),
    },
  };
}

export async function getLatestCycleStatus(db: QueryableDb): Promise<LatestCycleStatus | null> {
  const result = await db.query<LatestCycleStatus>(
    `SELECT id,
            job_name,
            status::text AS status,
            started_at,
            finished_at,
            duration_ms,
            records_processed,
            error_message,
            metadata_json
       FROM job_runs
      WHERE job_type = 'cycle'
      ORDER BY started_at DESC
      LIMIT 1`,
  );

  return result.rows[0] ?? null;
}

export async function getSourceFreshness(db: QueryableDb): Promise<SourceFreshnessRow[]> {
  const result = await db.query<SourceFreshnessRow>(
    `SELECT ds.name AS source_name,
            ds.freshness_minutes,
            ds.reliability_weight,
            latest.last_success_at,
            CASE
              WHEN latest.last_success_at IS NULL THEN NULL
              ELSE ROUND(EXTRACT(EPOCH FROM (NOW() - latest.last_success_at)) / 60.0)::INT
            END AS minutes_since_last_success,
            CASE
              WHEN latest.last_success_at IS NULL THEN true
              ELSE (NOW() - latest.last_success_at) > make_interval(mins => ds.freshness_minutes)
            END AS stale
       FROM data_sources ds
       LEFT JOIN LATERAL (
         SELECT jr.finished_at AS last_success_at
           FROM job_runs jr
          WHERE (jr.job_name = ds.name OR jr.job_name = REPLACE(ds.name, '-', '_'))
            AND jr.job_type = 'source'
            AND jr.status = 'success'
          ORDER BY jr.finished_at DESC
          LIMIT 1
       ) latest ON true
      ORDER BY ds.name ASC`,
  );

  return result.rows;
}

export async function getRecentFailures(db: QueryableDb, limit = 20): Promise<RecentFailureRow[]> {
  const result = await db.query<RecentFailureRow>(
    `SELECT id,
            job_name,
            job_type::text AS job_type,
            status::text AS status,
            started_at,
            finished_at,
            error_message,
            metadata_json
       FROM job_runs
      WHERE status IN ('failed', 'partial')
      ORDER BY started_at DESC
      LIMIT $1`,
    [limit],
  );

  return result.rows;
}

export async function getRecentCycleRuns(db: QueryableDb, limit = 20): Promise<CycleRunHistoryRow[]> {
  const result = await db.query<LatestCycleStatus>(
    `SELECT id,
            status::text AS status,
            started_at,
            finished_at,
            duration_ms,
            records_processed,
            metadata_json
       FROM job_runs
      WHERE job_type = 'cycle'
      ORDER BY started_at DESC
      LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => {
    const metadata = row.metadata_json ?? {};
    const failedJobs = Array.isArray(metadata.failedJobs) ? metadata.failedJobs.length : 0;

    return {
      id: row.id,
      status: row.status,
      started_at: row.started_at,
      finished_at: row.finished_at,
      duration_ms: row.duration_ms,
      records_processed: row.records_processed,
      snapshot_time: asStringOrNull(metadata.snapshotTime),
      alerts_generated: asNumberOrZero(metadata.alertsGenerated),
      regions_scored: asNumberOrZero(metadata.regionsScored),
      failed_jobs: failedJobs,
    };
  });
}

export async function getRecentSourceRuns(db: QueryableDb, limit = 50): Promise<SourceRunHistoryRow[]> {
  const result = await db.query<RecentFailureRow>(
    `SELECT id,
            job_name,
            status::text AS status,
            started_at,
            finished_at,
            duration_ms,
            records_processed,
            error_message,
            metadata_json
       FROM job_runs
      WHERE job_type = 'source'
      ORDER BY started_at DESC
      LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => {
    const metadata = row.metadata_json ?? {};
    return {
      id: row.id,
      source_name: String(row.job_name).replaceAll('_', '-'),
      status: row.status,
      started_at: row.started_at,
      finished_at: row.finished_at,
      duration_ms: row.duration_ms,
      records_processed: row.records_processed,
      mapped_regions: asNumberOrZero(metadata.mappedRegions),
      inserted_signals: asNumberOrZero(metadata.insertedSignals),
      error_message: row.error_message,
    };
  });
}

export async function getOpsHealth(db: QueryableDb): Promise<Record<string, unknown>> {
  const [latestCycle, sourceFreshness, recentFailures] = await Promise.all([
    getLatestCycleStatus(db),
    getSourceFreshness(db),
    getRecentFailures(db, 10),
  ]);

  const staleSources = sourceFreshness.filter((row) => row.stale).map((row) => row.source_name);

  return {
    status: latestCycle?.status === 'failed' || staleSources.length > 0 ? 'degraded' : 'ok',
    latest_cycle: latestCycle,
    stale_sources: staleSources,
    stale_source_count: staleSources.length,
    recent_failure_count: recentFailures.length,
  };
}

export async function getOpsSummary(db: QueryableDb): Promise<OpsSummary> {
  const [latestCycle, sourceFreshness, recentFailures, latestSourceRuns, latestSnapshotStats, lastSuccessCycle] = await Promise.all([
    getLatestCycleStatus(db),
    getSourceFreshness(db),
    getRecentFailures(db, 25),
    db.query<{ source_name: string; last_success_at: string | null; last_failure_at: string | null }>(
      `SELECT ds.name AS source_name,
              latest_success.last_success_at,
              latest_failure.last_failure_at
         FROM data_sources ds
         LEFT JOIN LATERAL (
            SELECT jr.finished_at AS last_success_at
              FROM job_runs jr
             WHERE (jr.job_name = ds.name OR jr.job_name = REPLACE(ds.name, '-', '_'))
               AND jr.job_type = 'source'
               AND jr.status = 'success'
             ORDER BY jr.finished_at DESC
             LIMIT 1
         ) latest_success ON true
         LEFT JOIN LATERAL (
            SELECT jr.finished_at AS last_failure_at
              FROM job_runs jr
             WHERE (jr.job_name = ds.name OR jr.job_name = REPLACE(ds.name, '-', '_'))
               AND jr.job_type = 'source'
               AND jr.status = 'failed'
             ORDER BY jr.finished_at DESC
             LIMIT 1
         ) latest_failure ON true
        ORDER BY ds.name ASC`,
    ),
    db.query<{ snapshot_time: string | null; alerts_generated: number; regions_scored: number }>(
      `SELECT latest_snapshot.snapshot_time,
              COALESCE(alerts.count, 0)::INT AS alerts_generated,
              COALESCE(scores.count, 0)::INT AS regions_scored
         FROM (SELECT MAX(snapshot_time) AS snapshot_time FROM region_scores) latest_snapshot
         LEFT JOIN LATERAL (
            SELECT COUNT(*) AS count
              FROM alerts_feed
             WHERE snapshot_time = latest_snapshot.snapshot_time
         ) alerts ON true
         LEFT JOIN LATERAL (
            SELECT COUNT(*) AS count
              FROM region_scores
             WHERE snapshot_time = latest_snapshot.snapshot_time
         ) scores ON true`,
    ),
    db.query<{ finished_at: string }>(
      `SELECT finished_at
         FROM job_runs
        WHERE job_type = 'cycle' AND status = 'success'
        ORDER BY finished_at DESC
        LIMIT 1`,
    ),
  ]);

  const staleSources = sourceFreshness.filter((row) => row.stale).map((row) => row.source_name);
  const snapshotRow = latestSnapshotStats.rows[0];

  return {
    latest_cycle: latestCycle,
    last_successful_cycle_at: lastSuccessCycle.rows[0]?.finished_at ?? null,
    stale_source_count: staleSources.length,
    stale_sources: staleSources,
    recent_failure_count: recentFailures.length,
    sources: latestSourceRuns.rows.map((row) => ({
      source_name: row.source_name,
      last_success_at: row.last_success_at,
      last_failure_at: row.last_failure_at,
      stale: staleSources.includes(row.source_name),
    })),
    latest_cycle_records_processed: latestCycle?.records_processed ?? 0,
    latest_snapshot_alerts_generated: snapshotRow?.alerts_generated ?? 0,
    latest_snapshot_regions_scored: snapshotRow?.regions_scored ?? 0,
  };
}

function asNumberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
