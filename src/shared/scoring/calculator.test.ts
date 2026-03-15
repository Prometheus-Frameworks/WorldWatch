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
  const freshness = deriveFreshnessState([
    { source: 'acled', domain: 'conflictPressure', observedSignals: 1, isMovingUp: true, isReliable: true, ageMinutes: 15 },
    { source: 'eia', domain: 'oilShockRisk', observedSignals: 1, isMovingUp: true, isReliable: true, ageMinutes: 800 },
    { source: 'unhcr', domain: 'displacementAcceleration', observedSignals: 1, isMovingUp: true, isReliable: true, ageMinutes: 900 },
  ]);

  assert.equal(freshness, 'stale');
});

test('deriveFreshnessState honors source coverage in single-domain fallback', () => {
  const freshness = deriveFreshnessState([
    { source: 'acled', domain: 'conflictPressure', observedSignals: 1, isMovingUp: true, isReliable: true, ageMinutes: 20 },
    { source: 'gdelt', domain: 'conflictPressure', observedSignals: 6, isMovingUp: true, isReliable: true, ageMinutes: 600 },
  ]);

  assert.equal(freshness, 'aging');
});

test('deriveConfidenceBand stays distinct from severity during disagreement', () => {
  const confidence = deriveConfidenceBand([
    { source: 'acled', domain: 'conflictPressure', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 30 },
    { source: 'gdelt', domain: 'narrativeHeat', observedSignals: 3, isMovingUp: false, isReliable: true, ageMinutes: 40 },
    { source: 'unhcr', domain: 'displacementAcceleration', observedSignals: 2, isMovingUp: true, isReliable: false, ageMinutes: 50 },
  ]);

  assert.equal(confidence, 'medium');
});
