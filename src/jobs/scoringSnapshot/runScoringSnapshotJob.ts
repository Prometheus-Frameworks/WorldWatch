import { calculateRegionScore } from '../../shared/scoring/calculator.ts';
import type { SignalHealth, SubScores, StatusBand } from '../../shared/scoring/types.ts';
import type { QueryableDb } from '../../ingestion/types.ts';
import { insertJobRun } from '../jobRunLogger.ts';
import { SNAPSHOT_JOB_CONFIG, type SnapshotJobConfig } from './config.ts';

interface RegionRow {
  id: number;
  slug: string;
  name: string;
}

interface SignalRow {
  region_id: number;
  source_name: SignalHealth['source'];
  signal_type: string;
  value: number;
  event_time: string;
  ingested_at: string;
  reliability_weight: number;
}

interface PreviousScoreRow {
  region_id: number;
  composite_score: number;
}

interface RankRow {
  region_id: number;
  rank: number;
}

const DOMAIN_KEYS: Array<keyof SubScores> = [
  'conflictPressure',
  'chokepointStress',
  'oilShockRisk',
  'displacementAcceleration',
  'narrativeHeat',
];

export interface SnapshotJobResult {
  snapshotTime: string;
  regionsProcessed: number;
  alertsInserted: number;
}

export async function runScoringSnapshotJob(
  db: QueryableDb,
  snapshotTime: Date = new Date(),
  config: SnapshotJobConfig = SNAPSHOT_JOB_CONFIG,
): Promise<SnapshotJobResult> {
  const startedAt = new Date();

  try {
    const regions = await db.query<RegionRow>('SELECT id, slug, name FROM regions ORDER BY id');

    const signals = await db.query<SignalRow>(
      `SELECT ns.region_id,
              ds.name as source_name,
              ns.signal_type,
              ns.value,
              ns.event_time,
              ns.ingested_at,
              ds.reliability_weight
        FROM normalized_signals ns
        JOIN data_sources ds ON ds.id = ns.source_id
        WHERE ns.event_time >= $1`,
      [new Date(snapshotTime.getTime() - config.lookbackHours * 3600 * 1000).toISOString()],
    );

    const byRegion = new Map<number, SignalRow[]>();
    for (const row of signals.rows) {
      if (!byRegion.has(row.region_id)) byRegion.set(row.region_id, []);
      byRegion.get(row.region_id)?.push(row);
    }

    const currentScores = new Map<number, number>();

    for (const region of regions.rows) {
      const regionSignals = byRegion.get(region.id) ?? [];
      const latestSignals = selectLatestSignalsByType(regionSignals);
      const subScores = buildSubScores(latestSignals, config);
      const health = buildSignalHealth(latestSignals, snapshotTime, config);
      const score = calculateRegionScore(subScores, health);

      currentScores.set(region.id, score.compositeScore);

      await db.query(
        `INSERT INTO region_scores (
          region_id, snapshot_time, composite_score, conflict_score, oil_score, chokepoint_score,
          displacement_score, narrative_score, status_band, confidence_band, evidence_state,
          freshness_state, factors_json, second_order_effects_json
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13::jsonb, $14::jsonb
        )
        ON CONFLICT (region_id, snapshot_time) DO UPDATE SET
          composite_score = EXCLUDED.composite_score,
          conflict_score = EXCLUDED.conflict_score,
          oil_score = EXCLUDED.oil_score,
          chokepoint_score = EXCLUDED.chokepoint_score,
          displacement_score = EXCLUDED.displacement_score,
          narrative_score = EXCLUDED.narrative_score,
          status_band = EXCLUDED.status_band,
          confidence_band = EXCLUDED.confidence_band,
          evidence_state = EXCLUDED.evidence_state,
          freshness_state = EXCLUDED.freshness_state,
          factors_json = EXCLUDED.factors_json,
          second_order_effects_json = EXCLUDED.second_order_effects_json`,
        [
          region.id,
          snapshotTime.toISOString(),
          score.compositeScore,
          subScores.conflictPressure,
          subScores.oilShockRisk,
          subScores.chokepointStress,
          subScores.displacementAcceleration,
          subScores.narrativeHeat,
          score.statusBand,
          score.confidenceBand,
          score.evidenceState,
          score.freshnessState,
          JSON.stringify(buildFactors(latestSignals, snapshotTime, config)),
          JSON.stringify([]),
        ],
      );
    }

    const previous24h = await getPreviousScores(db, new Date(snapshotTime.getTime() - 24 * 3600 * 1000));
    const previous7d = await getPreviousScores(db, new Date(snapshotTime.getTime() - 7 * 24 * 3600 * 1000));
    const previousRanks = await getPreviousRanks(db, snapshotTime);
    const currentRanks = rankScores(currentScores);
    let alertsInserted = 0;

    for (const region of regions.rows) {
      const current = currentScores.get(region.id) ?? 0;
      const delta24h = round2(current - (previous24h.get(region.id) ?? current));
      const delta7d = round2(current - (previous7d.get(region.id) ?? current));
      const rankMovement = (previousRanks.get(region.id) ?? currentRanks.get(region.id) ?? 0) - (currentRanks.get(region.id) ?? 0);

      await db.query(
        `INSERT INTO region_deltas (region_id, snapshot_time, delta_24h, delta_7d, rank_movement)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (region_id, snapshot_time) DO UPDATE SET
          delta_24h = EXCLUDED.delta_24h,
          delta_7d = EXCLUDED.delta_7d,
          rank_movement = EXCLUDED.rank_movement`,
        [region.id, snapshotTime.toISOString(), delta24h, delta7d, rankMovement],
      );

      const statusBand = deriveStatus(current);
      if (current >= config.alertScoreThreshold || delta24h >= config.alertDeltaThreshold) {
        alertsInserted += 1;
        await db.query(
          `INSERT INTO alerts_feed (
            region_id, snapshot_time, title, summary, severity, explanation_json
          ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
          [
            region.id,
            snapshotTime.toISOString(),
            `${region.name}: elevated volatility signal`,
            `Composite score ${current.toFixed(2)} (${statusBand}), 24h delta ${delta24h.toFixed(2)}.`,
            statusBand,
            JSON.stringify({ compositeScore: current, delta24h, delta7d }),
          ],
        );
      }
    }

    const finishedAt = new Date();
    await insertJobRun(db, {
      jobName: 'scoring_snapshot',
      jobType: 'snapshot',
      status: 'success',
      startedAt,
      finishedAt,
      recordsProcessed: regions.rows.length,
      metadata: {
        snapshotTime: snapshotTime.toISOString(),
        regionsProcessed: regions.rows.length,
        alertsInserted,
      },
    });

    return {
      snapshotTime: snapshotTime.toISOString(),
      regionsProcessed: regions.rows.length,
      alertsInserted,
    };
  } catch (error) {
    await insertJobRun(db, {
      jobName: 'scoring_snapshot',
      jobType: 'snapshot',
      status: 'failed',
      startedAt,
      finishedAt: new Date(),
      errorMessage: error instanceof Error ? error.message : String(error),
      metadata: {
        snapshotTime: snapshotTime.toISOString(),
      },
    });
    throw error;
  }
}

function selectLatestSignalsByType(rows: SignalRow[]): SignalRow[] {
  const latestByType = new Map<string, SignalRow>();

  for (const row of rows) {
    const current = latestByType.get(row.signal_type);
    if (!current) {
      latestByType.set(row.signal_type, row);
      continue;
    }

    const eventTime = new Date(row.event_time);
    const currentEventTime = new Date(current.event_time);
    if (eventTime > currentEventTime) {
      latestByType.set(row.signal_type, row);
      continue;
    }

    if (eventTime.getTime() === currentEventTime.getTime() && new Date(row.ingested_at) > new Date(current.ingested_at)) {
      latestByType.set(row.signal_type, row);
    }
  }

  return [...latestByType.values()];
}

function buildSubScores(rows: SignalRow[], config: SnapshotJobConfig): SubScores {
  const domainResult: SubScores = {
    conflictPressure: 0,
    chokepointStress: 0,
    oilShockRisk: 0,
    displacementAcceleration: 0,
    narrativeHeat: 0,
  };

  for (const key of DOMAIN_KEYS) {
    const weights = config.subScoreSignalWeights[key];
    let weightedTotal = 0;
    let appliedWeight = 0;

    for (const [signalType, weight] of Object.entries(weights)) {
      const latest = rows.find((row) => row.signal_type === signalType);
      if (!latest) continue;

      const normalized = normalizeSignal(latest.signal_type, latest.value, config);
      weightedTotal += normalized * weight;
      appliedWeight += weight;
    }

    domainResult[key] = round2(appliedWeight > 0 ? weightedTotal / appliedWeight : 0);
  }

  return domainResult;
}

function normalizeSignal(signalType: string, value: number, config: SnapshotJobConfig): number {
  const normalization = config.signalNormalization[signalType];
  if (!normalization) return Math.max(0, Math.min(100, value));

  const scaled = (value / normalization.max) * 100;
  const bounded = Math.max(0, Math.min(100, scaled));
  return normalization.invert ? round2(100 - bounded) : round2(bounded);
}

function deriveSignalDomain(signalType: string): keyof SubScores {
  if (signalType.startsWith('conflict.') || signalType.startsWith('thermal.')) return 'conflictPressure';
  if (signalType.startsWith('chokepoint.')) return 'chokepointStress';
  if (signalType.startsWith('oil.')) return 'oilShockRisk';
  if (signalType.startsWith('displacement.')) return 'displacementAcceleration';
  return 'narrativeHeat';
}

function buildSignalHealth(rows: SignalRow[], snapshotTime: Date, config: SnapshotJobConfig): SignalHealth[] {
  const sourceRows = new Map<SignalHealth['source'], SignalRow[]>();
  for (const row of rows) {
    if (!sourceRows.has(row.source_name)) sourceRows.set(row.source_name, []);
    sourceRows.get(row.source_name)?.push(row);
  }

  return [...sourceRows.entries()].map(([source, sourceSignals]) => {
    const newest = sourceSignals.reduce((current, candidate) => {
      if (!current) return candidate;
      if (new Date(candidate.event_time) > new Date(current.event_time)) return candidate;
      return current;
    }, sourceSignals[0]);

    return {
      source,
      domain: deriveSignalDomain(newest.signal_type),
      observedSignals: sourceSignals.length,
      isMovingUp: normalizeSignal(newest.signal_type, newest.value, config) >= 50,
      isReliable: newest.reliability_weight >= 0.6,
      ageMinutes: Math.max(
        0,
        Math.round((snapshotTime.getTime() - new Date(newest.event_time).getTime()) / (60 * 1000)),
      ),
    };
  });
}

function buildFactors(rows: SignalRow[], snapshotTime: Date, config: SnapshotJobConfig): Array<Record<string, unknown>> {
  const ordered = [...rows]
    .map((row) => ({
      ...row,
      normalizedValue: normalizeSignal(row.signal_type, row.value, config),
      domain: deriveSignalDomain(row.signal_type),
    }))
    .sort((a, b) => b.normalizedValue - a.normalizedValue);

  return ordered.slice(0, 10).map((row) => ({
    signalType: row.signal_type,
    domain: row.domain,
    value: row.value,
    normalizedValue: row.normalizedValue,
    source: row.source_name,
    sourceReliability: row.reliability_weight,
    recencyMinutes: Math.max(0, Math.round((snapshotTime.getTime() - new Date(row.event_time).getTime()) / (60 * 1000))),
    movement: row.normalizedValue >= 50 ? 'up' : 'down',
    eventTime: row.event_time,
    explainabilityNote: `${row.signal_type} contributes to ${row.domain} with normalized score ${row.normalizedValue}.`,
  }));
}

async function getPreviousScores(db: QueryableDb, timestamp: Date): Promise<Map<number, number>> {
  const result = await db.query<PreviousScoreRow>(
    `SELECT DISTINCT ON (region_id) region_id, composite_score
      FROM region_scores
      WHERE snapshot_time <= $1
      ORDER BY region_id, snapshot_time DESC`,
    [timestamp.toISOString()],
  );

  return new Map(result.rows.map((row) => [row.region_id, Number(row.composite_score)]));
}

async function getPreviousRanks(db: QueryableDb, snapshotTime: Date): Promise<Map<number, number>> {
  const result = await db.query<RankRow>(
    `WITH latest AS (
      SELECT DISTINCT ON (region_id) region_id, composite_score
      FROM region_scores
      WHERE snapshot_time < $1
      ORDER BY region_id, snapshot_time DESC
    )
    SELECT region_id,
          DENSE_RANK() OVER (ORDER BY composite_score DESC) AS rank
      FROM latest`,
    [snapshotTime.toISOString()],
  );

  return new Map(result.rows.map((row) => [row.region_id, row.rank]));
}

function rankScores(scores: Map<number, number>): Map<number, number> {
  const ordered = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const ranks = new Map<number, number>();
  for (const [index, [regionId]] of ordered.entries()) {
    ranks.set(regionId, index + 1);
  }
  return ranks;
}

function deriveStatus(score: number): StatusBand {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'elevated';
  return 'low';
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
