export interface TriageNote {
  title: string;
  copy: string;
}

export interface TriageInput {
  composite_score: number;
  status_band: string;
  confidence_band: string;
  freshness_state: string;
  delta_24h: number;
  delta_7d: number;
}

export interface TriageSpotlight {
  slug: string;
  name: string;
  notes: TriageNote[];
}

export interface ExplainabilityRow {
  factor_label: string;
  source: string;
  domain: string;
  normalized_contribution: number;
  recency_minutes: number;
  source_reliability: number;
  movement_direction: string;
}

export interface DetailExplainabilitySummary {
  freshness_state: string;
  freshness_copy: string;
  confidence_band: string;
  confidence_copy: string;
  evidence_state: string;
  evidence_copy: string;
}

export interface DetailExplainabilityGroups {
  top_contributing_factors: ExplainabilityRow[];
  freshest_contributing_sources: ExplainabilityRow[];
  stale_high_impact_sources: ExplainabilityRow[];
  mixed_signal_indicators: Array<{
    domain: string;
    directions: string[];
  }>;
}

const FACTOR_LABELS: Record<string, string> = {
  'conflict.fatalities': 'Conflict fatalities',
  'conflict.event_intensity': 'Conflict event intensity',
  'conflict.tension': 'Conflict tension',
  'thermal.anomaly_count': 'Thermal anomaly count',
  'thermal.fire_activity_index': 'Thermal fire activity index',
  'chokepoint.congestion': 'Chokepoint congestion',
  'chokepoint.delay_hours': 'Chokepoint delay hours',
  'chokepoint.transit_volume': 'Chokepoint transit volume',
  'oil.price_usd': 'Oil price',
  'oil.price_volatility': 'Oil price volatility',
  'displacement.delta': 'Displacement delta',
  'displacement.acceleration': 'Displacement acceleration',
  'narrative.mentions': 'Narrative mentions',
  'narrative.negative_tone': 'Narrative negative tone',
};

function toNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toExplainabilityRow(row: Record<string, unknown>): ExplainabilityRow {
  const signalType = String(row.signalType ?? 'unknown');
  return {
    factor_label: FACTOR_LABELS[signalType] ?? signalType,
    source: String(row.source ?? 'unknown'),
    domain: String(row.domain ?? 'unknown'),
    normalized_contribution: toNumber(row.normalizedValue),
    recency_minutes: toNumber(row.recencyMinutes),
    source_reliability: toNumber(row.sourceReliability),
    movement_direction: String(row.movement ?? 'flat'),
  };
}

export function buildDetailExplainabilityGroups(factors: unknown): DetailExplainabilityGroups {
  const rows = (Array.isArray(factors) ? factors : [])
    .filter((factor): factor is Record<string, unknown> => Boolean(factor && typeof factor === 'object'))
    .map(toExplainabilityRow)
    .sort((a, b) => b.normalized_contribution - a.normalized_contribution);

  const freshestUniqueBySource = new Map<string, ExplainabilityRow>();
  for (const row of [...rows].sort((a, b) => a.recency_minutes - b.recency_minutes)) {
    if (!freshestUniqueBySource.has(row.source)) {
      freshestUniqueBySource.set(row.source, row);
    }
  }

  const directionsByDomain = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!directionsByDomain.has(row.domain)) directionsByDomain.set(row.domain, new Set<string>());
    directionsByDomain.get(row.domain)?.add(row.movement_direction);
  }

  return {
    top_contributing_factors: rows.slice(0, 6),
    freshest_contributing_sources: [...freshestUniqueBySource.values()].slice(0, 4),
    stale_high_impact_sources: rows.filter((row) => row.recency_minutes > 720 && row.normalized_contribution >= 60).slice(0, 4),
    mixed_signal_indicators: [...directionsByDomain.entries()]
      .filter(([, directions]) => directions.size > 1)
      .map(([domain, directions]) => ({ domain, directions: [...directions].sort() })),
  };
}

export function deriveDetailExplainabilitySummary(input: Pick<TriageInput, 'freshness_state' | 'confidence_band'> & { evidence_state: string }): DetailExplainabilitySummary {
  const freshnessCopyByState: Record<string, string> = {
    fresh: 'Freshness is fresh because current contributing evidence is within the expected recency window.',
    aging: 'Freshness is aging because part of the contributing evidence is outside the fresh recency window.',
    stale: 'Freshness is degraded because key contributing evidence is outside the aging recency window.',
  };

  const confidenceCopyByBand: Record<string, string> = {
    high: 'Confidence is high: multiple reliable sources and domains agree on the current direction.',
    medium: 'Confidence is medium: some reliable domain agreement exists, but coverage is not broad.',
    low: 'Confidence is low: multiple reliable domains do not yet agree strongly enough for high confidence.',
  };

  const evidenceCopyByState: Record<string, string> = {
    confirmed: 'Evidence is confirmed: reliable indicators are aligned and sufficiently complete.',
    mixed: 'Evidence is mixed: reliable indicators disagree on movement direction.',
    incomplete: 'Evidence is incomplete: available reliable indicators are limited.',
    unknown: 'Evidence is unknown: no usable indicators are currently available.',
  };

  return {
    freshness_state: input.freshness_state,
    freshness_copy: freshnessCopyByState[input.freshness_state] ?? 'Freshness state is unavailable in the current payload.',
    confidence_band: input.confidence_band,
    confidence_copy: confidenceCopyByBand[input.confidence_band] ?? 'Confidence band is unavailable in the current payload.',
    evidence_state: input.evidence_state,
    evidence_copy: evidenceCopyByState[input.evidence_state] ?? 'Evidence state is unavailable in the current payload.',
  };
}

export function deriveTriageNotes(input: TriageInput): TriageNote[] {
  const notes: TriageNote[] = [];

  if (Number.isFinite(input.delta_24h) && input.delta_24h >= 7) {
    notes.push({
      title: 'Top mover (24h)',
      copy: 'Rapid daily movement detected. Prioritize validation of newest factor inputs.',
    });
  }

  if (Number.isFinite(input.delta_7d) && input.delta_7d >= 12) {
    notes.push({
      title: 'Sustained weekly acceleration',
      copy: '7-day trend remains elevated. Check whether pressure is broad-based or source-specific.',
    });
  }

  if ((input.status_band === 'high' || input.status_band === 'critical') && input.freshness_state !== 'fresh') {
    notes.push({
      title: 'Stale high-risk pattern',
      copy: 'Risk is high but freshness is degraded. Consider source rerun or analyst verification.',
    });
  }

  if (input.composite_score >= 70 && input.confidence_band === 'low') {
    notes.push({
      title: 'High risk with low confidence',
      copy: 'Elevated score and lower confidence suggest careful human review before escalation.',
    });
  }

  if (notes.length === 0) {
    notes.push({
      title: 'No immediate triage flags',
      copy: 'Current region mix is comparatively stable. Continue normal monitoring cadence.',
    });
  }

  return notes.slice(0, 3);
}

export function toTriageInput(region: Partial<TriageInput>): TriageInput {
  return {
    composite_score: Number(region.composite_score ?? 0),
    status_band: String(region.status_band ?? ''),
    confidence_band: String(region.confidence_band ?? ''),
    freshness_state: String(region.freshness_state ?? ''),
    delta_24h: Number(region.delta_24h ?? 0),
    delta_7d: Number(region.delta_7d ?? 0),
  };
}

export function buildTriageSpotlight(regions: Array<{ slug: string; name: string } & Partial<TriageInput>>): TriageSpotlight[] {
  const sorted = [...regions].sort((a, b) => Number(b.composite_score ?? 0) - Number(a.composite_score ?? 0));
  return sorted.slice(0, 5).map((region) => ({
    slug: region.slug,
    name: region.name,
    notes: deriveTriageNotes(toTriageInput(region)),
  }));
}
