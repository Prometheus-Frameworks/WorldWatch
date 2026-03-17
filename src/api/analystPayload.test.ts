import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDetailExplainabilityGroups,
  deriveDetailExplainabilitySummary,
  deriveTriageNotes,
  toTriageInput,
} from './analystPayload.ts';
import {
  displacementLimitedSupportScenario,
  mixedMultiDomainDisagreementScenario,
  narrativeLedSpikeFlatPhysicalScenario,
} from '../test/regionScenarioFixtures.ts';

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
    status_band: 'elevated',
    evidence_state: 'mixed',
    factors,
    explainability_groups: explainabilityGroups,
  });

  assert.equal(summary.freshness_copy, 'Freshness is aging because only 3 reliable domains have fresh inputs while 2 other contributing domains are outside the fresh window.');
  assert.equal(summary.confidence_copy, 'Confidence is medium because conflict and shipping align, but cross-domain coverage is uneven.');
  assert.equal(summary.evidence_copy, 'Evidence is mixed because EIA is flat while PortWatch is down while GDELT is up.');
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

test('disagreement groups use deterministic reliability/contribution/recency ordering', () => {
  const groups = buildDetailExplainabilityGroups(mixedMultiDomainDisagreementScenario().factors);

  assert.deepEqual(groups.source_disagreement_groups.map((group) => group.domain), ['conflictPressure', 'oilShockRisk']);
  assert.deepEqual(groups.source_disagreement_groups[0]?.disagreeing_sources, [
    { source: 'acled', movement_direction: 'up', recency_minutes: 45, source_reliability: 0.9 },
    { source: 'gdelt', movement_direction: 'down', recency_minutes: 390, source_reliability: 0.65 },
  ]);
});

test('narrative-led spike exposes explicit narrative-vs-physical divergence cue', () => {
  const groups = buildDetailExplainabilityGroups(narrativeLedSpikeFlatPhysicalScenario().factors);

  assert.equal(groups.narrative_physical_divergence.is_active, true);
  assert.equal(groups.narrative_physical_divergence.cue_code, 'narrative-leading-without-physical-confirmation');
  assert.equal(groups.narrative_physical_divergence.analyst_copy, 'Narrative-leading signal: media/narrative intensity is elevated without matching confirmation from physical/logistical domains.');
  assert.equal(groups.narrative_physical_divergence.physical_domain_states.every((row) => row.state === 'flat' || row.state === 'incomplete'), true);
});

test('explainability summaries stay truthful for stale high-impact evidence and disagreement context', () => {
  const factors = [
    { signalType: 'chokepoint.delay_hours', source: 'imf-portwatch', domain: 'chokepointStress', normalizedValue: 82, recencyMinutes: 80, sourceReliability: 0.86, movement: 'down' },
    { signalType: 'chokepoint.congestion', source: 'gdelt', domain: 'chokepointStress', normalizedValue: 74, recencyMinutes: 910, sourceReliability: 0.71, movement: 'up' },
    { signalType: 'narrative.mentions', source: 'gdelt', domain: 'narrativeHeat', normalizedValue: 79, recencyMinutes: 50, sourceReliability: 0.68, movement: 'up' },
    { signalType: 'thermal.fire_activity_index', source: 'nasa_firms', domain: 'conflictPressure', normalizedValue: 63, recencyMinutes: 35, sourceReliability: 0.72, movement: 'up' },
  ];

  const groups = buildDetailExplainabilityGroups(factors);
  const summary = deriveDetailExplainabilitySummary({
    freshness_state: 'aging',
    confidence_band: 'low',
    status_band: 'high',
    evidence_state: 'mixed',
    factors,
    explainability_groups: groups,
  });

  assert.equal(groups.stale_high_impact_sources[0]?.source, 'gdelt');
  assert.equal(groups.source_disagreement_groups[0]?.domain, 'chokepointStress');
  assert.equal(summary.freshness_copy.includes('outside the fresh window'), true);
  assert.equal(summary.confidence_copy.includes('domain disagreement cluster'), true);
  assert.equal(summary.evidence_copy.includes('PortWatch is down while GDELT is up'), true);
});

test('domain odd-case: displacement signal with limited support remains incomplete', () => {
  const scenario = displacementLimitedSupportScenario();
  const groups = buildDetailExplainabilityGroups(scenario.factors);
  const summary = deriveDetailExplainabilitySummary({
    freshness_state: 'fresh',
    confidence_band: 'low',
    status_band: 'elevated',
    evidence_state: 'incomplete',
    factors: scenario.factors,
    explainability_groups: groups,
  });

  assert.equal(groups.top_contributing_factors[0]?.domain, 'displacementStress');
  assert.equal(summary.evidence_copy, 'Evidence is incomplete because only 1 contributing domain meets the high-impact threshold.');
});


test('deriveDetailExplainabilitySummary emits deterministic escalation posture cues', () => {
  const narrativeGroups = buildDetailExplainabilityGroups(narrativeLedSpikeFlatPhysicalScenario().factors);
  const narrative = deriveDetailExplainabilitySummary({
    freshness_state: 'fresh',
    confidence_band: 'high',
    status_band: 'critical',
    evidence_state: 'mixed',
    factors: narrativeLedSpikeFlatPhysicalScenario().factors,
    explainability_groups: narrativeGroups,
  });
  assert.equal(narrative.escalation_code, 'narrative-leading-caution');

  const careful = deriveDetailExplainabilitySummary({
    freshness_state: 'aging',
    confidence_band: 'low',
    status_band: 'high',
    evidence_state: 'mixed',
    factors: mixedMultiDomainDisagreementScenario().factors,
    explainability_groups: buildDetailExplainabilityGroups(mixedMultiDomainDisagreementScenario().factors),
  });
  assert.equal(careful.escalation_code, 'high-severity-low-confidence');

  const strong = deriveDetailExplainabilitySummary({
    freshness_state: 'fresh',
    confidence_band: 'high',
    status_band: 'critical',
    evidence_state: 'confirmed',
    factors: [
      { signalType: 'conflict.fatalities', source: 'acled', domain: 'conflictPressure', normalizedValue: 88, recencyMinutes: 50, sourceReliability: 0.91, movement: 'up' },
      { signalType: 'chokepoint.delay_hours', source: 'imf-portwatch', domain: 'chokepointStress', normalizedValue: 83, recencyMinutes: 55, sourceReliability: 0.86, movement: 'up' },
    ],
    explainability_groups: buildDetailExplainabilityGroups([
      { signalType: 'conflict.fatalities', source: 'acled', domain: 'conflictPressure', normalizedValue: 88, recencyMinutes: 50, sourceReliability: 0.91, movement: 'up' },
      { signalType: 'chokepoint.delay_hours', source: 'imf-portwatch', domain: 'chokepointStress', normalizedValue: 83, recencyMinutes: 55, sourceReliability: 0.86, movement: 'up' },
    ]),
  });
  assert.equal(strong.escalation_code, 'high-severity-high-confidence');
});
