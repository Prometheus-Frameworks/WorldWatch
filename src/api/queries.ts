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
