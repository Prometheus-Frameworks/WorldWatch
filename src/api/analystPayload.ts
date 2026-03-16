import { EXPLAINABILITY_THRESHOLDS } from './explainabilityConfig.ts';

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
  source_disagreement_groups: Array<{
    domain: string;
    disagreeing_sources: Array<{
      source: string;
      movement_direction: string;
      recency_minutes: number;
      source_reliability: number;
    }>;
    disagreement_types: string[];
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

function formatDomain(domain: string): string {
  const labels: Record<string, string> = {
    conflictPressure: 'conflict',
    chokepointStress: 'shipping',
    oilShockRisk: 'oil',
    displacementStress: 'displacement',
    narrativeHeat: 'narrative',
  };
  return labels[domain] ?? domain;
}

function formatSource(source: string): string {
  const labels: Record<string, string> = {
    gdelt: 'GDELT',
    eia: 'EIA',
    'imf-portwatch': 'PortWatch',
    acled: 'ACLED',
    unhcr: 'UNHCR',
    nasa_firms: 'NASA FIRMS',
  };
  return labels[source] ?? source;
}

function toExplainabilityRows(factors: unknown): ExplainabilityRow[] {
  return (Array.isArray(factors) ? factors : [])
    .filter((factor): factor is Record<string, unknown> => Boolean(factor && typeof factor === 'object'))
    .map(toExplainabilityRow)
    .sort((a, b) => b.normalized_contribution - a.normalized_contribution);
}

export function buildDetailExplainabilityGroups(factors: unknown): DetailExplainabilityGroups {
  const rows = toExplainabilityRows(factors);

  const freshestUniqueBySource = new Map<string, ExplainabilityRow>();
  for (const row of [...rows].sort((a, b) => a.recency_minutes - b.recency_minutes)) {
    if (!freshestUniqueBySource.has(row.source)) {
      freshestUniqueBySource.set(row.source, row);
    }
  }

  const directionsByDomain = new Map<string, Set<string>>();
  const domainSourceRows = new Map<string, Map<string, ExplainabilityRow>>();
  for (const row of rows) {
    if (!directionsByDomain.has(row.domain)) directionsByDomain.set(row.domain, new Set<string>());
    directionsByDomain.get(row.domain)?.add(row.movement_direction);

    if (!domainSourceRows.has(row.domain)) domainSourceRows.set(row.domain, new Map<string, ExplainabilityRow>());
    const sourceRows = domainSourceRows.get(row.domain);
    const existing = sourceRows?.get(row.source);
    if (!existing || row.normalized_contribution > existing.normalized_contribution) {
      sourceRows?.set(row.source, row);
    }
  }

  const sourceDisagreementGroups = [...domainSourceRows.entries()]
    .map(([domain, bySource]) => {
      const sourceRows = [...bySource.values()].sort((a, b) => b.normalized_contribution - a.normalized_contribution);
      if (sourceRows.length < 2) return null;
      const directions = new Set(sourceRows.map((row) => row.movement_direction));
      const hasDirectional = directions.size > 1;
      const hasFresh = sourceRows.some((row) => row.recency_minutes <= EXPLAINABILITY_THRESHOLDS.freshWindowMinutes);
      const hasStale = sourceRows.some((row) => row.recency_minutes > EXPLAINABILITY_THRESHOLDS.freshWindowMinutes);
      const hasStaleVsFresh = hasFresh && hasStale;
      const reliabilityValues = sourceRows.map((row) => row.source_reliability);
      const reliabilitySpread = Math.max(...reliabilityValues) - Math.min(...reliabilityValues);
      const hasReliabilityWeighted = hasDirectional && reliabilitySpread >= EXPLAINABILITY_THRESHOLDS.reliabilitySpreadThreshold;
      const disagreementTypes = [
        hasDirectional ? 'directional' : null,
        hasStaleVsFresh ? 'stale-vs-fresh' : null,
        hasReliabilityWeighted ? 'reliability-weighted' : null,
      ].filter((value): value is string => Boolean(value));
      if (disagreementTypes.length === 0) return null;
      return {
        domain,
        disagreeing_sources: sourceRows.map((row) => ({
          source: row.source,
          movement_direction: row.movement_direction,
          recency_minutes: row.recency_minutes,
          source_reliability: row.source_reliability,
        })),
        disagreement_types: disagreementTypes,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  return {
    top_contributing_factors: rows.slice(0, 6),
    freshest_contributing_sources: [...freshestUniqueBySource.values()].slice(0, 4),
    stale_high_impact_sources: rows
      .filter(
        (row) => row.recency_minutes > EXPLAINABILITY_THRESHOLDS.staleHighImpactRecencyMinutes
          && row.normalized_contribution >= EXPLAINABILITY_THRESHOLDS.normalizedContributionFloor,
      )
      .slice(0, 4),
    mixed_signal_indicators: [...directionsByDomain.entries()]
      .filter(([, directions]) => directions.size > 1)
      .map(([domain, directions]) => ({ domain, directions: [...directions].sort() })),
    source_disagreement_groups: sourceDisagreementGroups,
  };
}

export function deriveDetailExplainabilitySummary(
  input: Pick<TriageInput, 'freshness_state' | 'confidence_band'> & {
    evidence_state: string;
    factors?: unknown;
    explainability_groups?: DetailExplainabilityGroups;
  },
): DetailExplainabilitySummary {
  const rows = toExplainabilityRows(input.factors);
  const highImpactRows = rows.filter((row) => row.normalized_contribution >= EXPLAINABILITY_THRESHOLDS.normalizedContributionFloor);
  const reliableRows = highImpactRows.filter((row) => row.source_reliability >= EXPLAINABILITY_THRESHOLDS.reliableSourceFloor);
  const contributingDomainCount = new Set(highImpactRows.map((row) => row.domain)).size;
  const freshReliableDomainCount = new Set(
    reliableRows
      .filter((row) => row.recency_minutes <= EXPLAINABILITY_THRESHOLDS.freshWindowMinutes)
      .map((row) => row.domain),
  ).size;
  const staleReliableDomainCount = new Set(
    reliableRows
      .filter((row) => row.recency_minutes > EXPLAINABILITY_THRESHOLDS.freshWindowMinutes)
      .map((row) => row.domain),
  ).size;
  const mixedDomains = input.explainability_groups?.mixed_signal_indicators ?? [];
  const alignedDomains = new Set(
    reliableRows
      .map((row) => row.domain)
      .filter((domain) => !mixedDomains.some((item) => item.domain === domain)),
  );

  const freshnessCopyByState: Record<string, string> = {
    fresh: `Freshness is fresh because ${freshReliableDomainCount || 1} reliable contributing domain${freshReliableDomainCount === 1 ? ' is' : 's are'} inside the fresh window and no high-impact domains are stale.`,
    aging: `Freshness is aging because only ${freshReliableDomainCount} reliable domain${freshReliableDomainCount === 1 ? '' : 's'} ${freshReliableDomainCount === 1 ? 'has' : 'have'} fresh inputs while ${staleReliableDomainCount} other contributing domain${staleReliableDomainCount === 1 ? '' : 's'} ${staleReliableDomainCount === 1 ? 'is' : 'are'} outside the fresh window.`,
    stale: `Freshness is degraded because ${staleReliableDomainCount || 1} high-impact reliable domain${staleReliableDomainCount === 1 ? ' is' : 's are'} outside the fresh window and only ${freshReliableDomainCount} reliable domain${freshReliableDomainCount === 1 ? ' remains' : 's remain'} fresh.`,
  };

  const confidenceCopyByBand: Record<string, string> = {
    high: `Confidence is high because ${alignedDomains.size} reliable domain${alignedDomains.size === 1 ? '' : 's'} align and disagreement is limited.`,
    medium: `Confidence is medium because ${[...alignedDomains].map(formatDomain).slice(0, 2).join(' and ') || 'reliable indicators'} align, but ${contributingDomainCount < 3 ? 'coverage is limited' : 'cross-domain coverage is uneven'}.`,
    low: `Confidence is low because ${input.explainability_groups?.source_disagreement_groups.length ?? 0} domain disagreement cluster${(input.explainability_groups?.source_disagreement_groups.length ?? 0) === 1 ? '' : 's'} are active and only ${alignedDomains.size} reliable domain${alignedDomains.size === 1 ? '' : 's'} align.`,
  };

  const disagreement = input.explainability_groups?.source_disagreement_groups[0];
  const disagreementSourceCopy = disagreement
    ? disagreement.disagreeing_sources
      .slice(0, 3)
      .map((row) => `${formatSource(row.source)} is ${row.movement_direction}`)
      .join(' while ')
    : null;
  const evidenceCopyByState: Record<string, string> = {
    confirmed: `Evidence is confirmed because ${alignedDomains.size || 1} reliable domain${alignedDomains.size === 1 ? '' : 's'} show aligned movement with fresh coverage.`,
    mixed: `Evidence is mixed because ${disagreementSourceCopy ?? 'reliable sources disagree on movement direction'}.`,
    incomplete: `Evidence is incomplete because only ${contributingDomainCount} contributing domain${contributingDomainCount === 1 ? '' : 's'} meet the high-impact threshold.`,
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
