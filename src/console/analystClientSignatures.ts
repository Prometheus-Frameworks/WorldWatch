export function getFilterOptionsSignature(rows: Array<Record<string, unknown>>): string {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => [row.status_band, row.confidence_band, row.freshness_state, row.evidence_state].join('|'))
    .sort()
    .join(';');
}

export function getRenderRowSignature(rows: Array<Record<string, unknown>>): string {
  return rows
    .map((row) => [row.slug, row.composite_score, row.delta_24h, row.delta_7d, row.status_band, row.confidence_band, row.snapshot_time].join('|'))
    .join(';');
}

export function getTableSignature(
  rows: Array<Record<string, unknown>>,
  activeRegionSlug: string | null,
  hoveredRegionSlug: string | null,
): string {
  return `${getRenderRowSignature(rows)}|active:${activeRegionSlug ?? 'none'}|hover:${hoveredRegionSlug ?? 'none'}`;
}

export function getMapSignature(
  rows: Array<Record<string, unknown>>,
  activeRegionSlug: string | null,
  hoveredRegionSlug: string | null,
): string {
  return (
    rows.map((row) => `${row.slug}:${row.status_band}`).join(';') +
    `|active:${activeRegionSlug ?? 'none'}|hover:${hoveredRegionSlug ?? 'none'}`
  );
}

export function getFeedSignature(feed: Array<Record<string, unknown>>): string {
  const normalizedFeed = Array.isArray(feed) ? feed : [];
  return normalizedFeed
    .slice(0, 30)
    .map((row) => [row.slug, row.snapshot_time, row.composite_score, row.delta_24h, row.delta_7d, row.status_band, row.confidence_band, row.freshness_state, row.evidence_state].join('|'))
    .join(';');
}

export function getSummarySignature(summary: Record<string, unknown> | null): string {
  return JSON.stringify(summary ?? null);
}

export function getDetailSignature(detail: Record<string, unknown> | null): string {
  if (!detail) return 'null';
  const latest = detail.latest_score as Record<string, unknown> | undefined;
  const history = Array.isArray(detail.history) ? detail.history : [];
  return JSON.stringify({
    latestSnapshot: latest?.snapshot_time ?? null,
    latestScore: latest?.composite_score ?? null,
    deltas: detail.latest_delta ?? null,
    historyTail: history.slice(0, 8),
    factors: Array.isArray(detail.factor_payload) ? detail.factor_payload.length : 0,
    secondOrder: Array.isArray(detail.second_order_effects) ? detail.second_order_effects.length : 0,
    signals: Array.isArray(detail.recent_signals) ? detail.recent_signals.length : 0,
    sourceContributions: Array.isArray(detail.source_contributions) ? detail.source_contributions.length : 0,
    triage: Array.isArray(detail.triage_notes) ? detail.triage_notes : [],
    explainabilitySummary: detail.explainability_summary ?? null,
    explainabilityGroups: detail.explainability_groups ?? null,
  });
}
