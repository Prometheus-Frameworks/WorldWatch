import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDetailExplainabilityGroups,
  deriveDetailExplainabilitySummary,
  deriveTriageNotes,
  toTriageInput,
} from './analystPayload.ts';

test('deriveTriageNotes returns deterministic triage notes from score bands and deltas', () => {
  const notes = deriveTriageNotes(toTriageInput({
    composite_score: 80,
    status_band: 'high',
    confidence_band: 'low',
    freshness_state: 'stale',
    delta_24h: 8,
    delta_7d: 15,
  }));

  assert.deepEqual(notes.map((note) => note.title), [
    'Top mover (24h)',
    'Sustained weekly acceleration',
    'Stale high-risk pattern',
  ]);
});

test('deriveTriageNotes returns stable no-flag fallback', () => {
  const notes = deriveTriageNotes(toTriageInput({
    composite_score: 40,
    status_band: 'elevated',
    confidence_band: 'high',
    freshness_state: 'fresh',
    delta_24h: 1,
    delta_7d: 2,
  }));

  assert.equal(notes.length, 1);
  assert.equal(notes[0].title, 'No immediate triage flags');
});

test('deriveDetailExplainabilitySummary returns deterministic local-condition copy', () => {
  const factors = [
    { signalType: 'conflict.fatalities', source: 'acled', domain: 'conflictPressure', normalizedValue: 83, recencyMinutes: 120, sourceReliability: 0.9, movement: 'up' },
    { signalType: 'chokepoint.delay_hours', source: 'imf-portwatch', domain: 'chokepointStress', normalizedValue: 71, recencyMinutes: 180, sourceReliability: 0.82, movement: 'up' },
    { signalType: 'displacement.delta', source: 'unhcr', domain: 'displacementStress', normalizedValue: 62, recencyMinutes: 910, sourceReliability: 0.92, movement: 'up' },
    { signalType: 'oil.price_usd', source: 'eia', domain: 'oilShockRisk', normalizedValue: 65, recencyMinutes: 500, sourceReliability: 0.9, movement: 'flat' },
    { signalType: 'oil.price_volatility', source: 'gdelt', domain: 'oilShockRisk', normalizedValue: 64, recencyMinutes: 200, sourceReliability: 0.8, movement: 'up' },
    { signalType: 'chokepoint.transit_volume', source: 'imf-portwatch', domain: 'oilShockRisk', normalizedValue: 63, recencyMinutes: 820, sourceReliability: 0.81, movement: 'down' },
  ];
  const explainabilityGroups = buildDetailExplainabilityGroups(factors);
  const summary = deriveDetailExplainabilitySummary({
    freshness_state: 'aging',
    confidence_band: 'medium',
    evidence_state: 'mixed',
    factors,
    explainability_groups: explainabilityGroups,
  });

  assert.equal(summary.freshness_copy, 'Freshness is aging because only 3 reliable domains have fresh inputs while 2 other contributing domains are outside the fresh window.');
  assert.equal(summary.confidence_copy, 'Confidence is medium because conflict and shipping align, but cross-domain coverage is uneven.');
  assert.equal(summary.evidence_copy, 'Evidence is mixed because EIA is flat while GDELT is up while PortWatch is down.');
});

test('buildDetailExplainabilityGroups includes source disagreement structure and thresholded stale impacts', () => {
  const groups = buildDetailExplainabilityGroups([
    { signalType: 'oil.price_volatility', source: 'eia', domain: 'oilShockRisk', normalizedValue: 67, recencyMinutes: 900, sourceReliability: 0.95, movement: 'down' },
    { signalType: 'oil.price_usd', source: 'gdelt', domain: 'oilShockRisk', normalizedValue: 63, recencyMinutes: 120, sourceReliability: 0.6, movement: 'up' },
    { signalType: 'chokepoint.delay_hours', source: 'imf-portwatch', domain: 'chokepointStress', normalizedValue: 78, recencyMinutes: 50, sourceReliability: 0.8, movement: 'up' },
  ]);

  assert.equal(groups.stale_high_impact_sources[0]?.source, 'eia');
  assert.deepEqual(groups.mixed_signal_indicators, [{ domain: 'oilShockRisk', directions: ['down', 'up'] }]);
  assert.deepEqual(groups.source_disagreement_groups, [{
    domain: 'oilShockRisk',
    disagreeing_sources: [
      { source: 'eia', movement_direction: 'down', recency_minutes: 900, source_reliability: 0.95 },
      { source: 'gdelt', movement_direction: 'up', recency_minutes: 120, source_reliability: 0.6 },
    ],
    disagreement_types: ['directional', 'stale-vs-fresh', 'reliability-weighted'],
  }]);
});
