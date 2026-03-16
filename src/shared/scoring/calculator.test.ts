import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateRegionScore,
  computeCompositeScore,
  deriveConfidenceBand,
  deriveEvidenceState,
  deriveFreshnessState,
} from './calculator.ts';
import type { SubScores } from './types.ts';
import {
  freshVsStaleUnevenCoverageScenario,
  highSeverityLowConfidenceScenario,
  singleSourceSpikeVsBroaderStaleSupportScenario,
} from '../../test/regionScenarioFixtures.ts';

const baseSubScores: SubScores = {
  conflictPressure: 68,
  chokepointStress: 75,
  oilShockRisk: 79,
  displacementAcceleration: 22,
  narrativeHeat: 66,
};

test('computeCompositeScore applies default config-driven weights', () => {
  const composite = computeCompositeScore(baseSubScores);
  assert.equal(composite, 64.85);
});

test('calculateRegionScore derives high-confidence confirmed states with aligned reliable signals', () => {
  const result = calculateRegionScore(baseSubScores, [
    { source: 'acled', domain: 'conflictPressure', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 20 },
    { source: 'imf-portwatch', domain: 'chokepointStress', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 60 },
    { source: 'eia', domain: 'oilShockRisk', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 120 },
  ]);

  assert.equal(result.statusBand, 'high');
  assert.equal(result.confidenceBand, 'high');
  assert.equal(result.freshnessState, 'fresh');
  assert.equal(result.evidenceState, 'confirmed');
});

test('deriveEvidenceState returns mixed when reliable datasets conflict', () => {
  const mixed = deriveEvidenceState(
    [
      { source: 'acled', domain: 'conflictPressure', observedSignals: 1, isMovingUp: true, isReliable: true, ageMinutes: 50 },
      { source: 'gdelt', domain: 'narrativeHeat', observedSignals: 1, isMovingUp: false, isReliable: true, ageMinutes: 30 },
    ],
    'medium',
  );

  assert.equal(mixed, 'mixed');
});

test('deriveFreshnessState uses domain-aware recency so one fresh source cannot dominate', () => {
  const freshness = deriveFreshnessState(freshVsStaleUnevenCoverageScenario().signals);

  assert.equal(freshness, 'stale');
});

test('deriveFreshnessState honors source coverage in single-domain fallback', () => {
  const freshness = deriveFreshnessState([
    { source: 'acled', domain: 'conflictPressure', observedSignals: 1, isMovingUp: true, isReliable: true, ageMinutes: 20 },
    { source: 'gdelt', domain: 'conflictPressure', observedSignals: 6, isMovingUp: true, isReliable: true, ageMinutes: 600 },
  ]);

  assert.equal(freshness, 'aging');
});

test('deriveFreshnessState keeps one fresh low-signal source from outranking broad stale coverage', () => {
  const freshness = deriveFreshnessState(singleSourceSpikeVsBroaderStaleSupportScenario().signals);

  assert.equal(freshness, 'stale');
});

test('deriveFreshnessState returns aging when one reliable domain is fresh and others are aging', () => {
  const freshness = deriveFreshnessState([
    { source: 'acled', domain: 'conflictPressure', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 55 },
    { source: 'imf-portwatch', domain: 'chokepointStress', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 420 },
    { source: 'eia', domain: 'oilShockRisk', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 470 },
  ]);

  assert.equal(freshness, 'aging');
});

test('deriveConfidenceBand degrades under reliable-source disagreement regardless of severity', () => {
  const confidence = deriveConfidenceBand([
    { source: 'acled', domain: 'conflictPressure', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 30 },
    { source: 'gdelt', domain: 'narrativeHeat', observedSignals: 3, isMovingUp: false, isReliable: true, ageMinutes: 40 },
    { source: 'unhcr', domain: 'displacementAcceleration', observedSignals: 2, isMovingUp: true, isReliable: false, ageMinutes: 50 },
  ]);

  assert.equal(confidence, 'low');
});

test('high score can remain low confidence and mixed evidence during reliable disagreement', () => {
  const scenario = highSeverityLowConfidenceScenario();

  const result = calculateRegionScore(scenario.subScores as SubScores, scenario.signals);

  assert.equal(result.statusBand, 'critical');
  assert.equal(result.confidenceBand, 'low');
  assert.equal(result.evidenceState, 'mixed');
});

test('moderate score can still carry high confidence when reliable sources agree', () => {
  const moderateSubScores: SubScores = {
    conflictPressure: 48,
    chokepointStress: 52,
    oilShockRisk: 47,
    displacementAcceleration: 42,
    narrativeHeat: 45,
  };

  const result = calculateRegionScore(moderateSubScores, [
    { source: 'acled', domain: 'conflictPressure', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 45 },
    { source: 'imf-portwatch', domain: 'chokepointStress', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 70 },
    { source: 'eia', domain: 'oilShockRisk', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 80 },
  ]);

  assert.equal(result.compositeScore < 60, true);
  assert.equal(result.statusBand, 'elevated');
  assert.equal(result.confidenceBand, 'high');
  assert.equal(result.evidenceState, 'confirmed');
});

test('single-source spikes keep confidence and evidence conservative', () => {
  const confidence = deriveConfidenceBand([
    { source: 'acled', domain: 'conflictPressure', observedSignals: 6, isMovingUp: true, isReliable: true, ageMinutes: 35 },
  ]);
  const evidence = deriveEvidenceState([
    { source: 'acled', domain: 'conflictPressure', observedSignals: 6, isMovingUp: true, isReliable: true, ageMinutes: 35 },
  ], confidence);

  assert.equal(confidence, 'low');
  assert.equal(evidence, 'incomplete');
});
