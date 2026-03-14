import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateRegionScore,
  computeCompositeScore,
  deriveEvidenceState,
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
    { source: 'acled', isMovingUp: true, isReliable: true, ageMinutes: 20 },
    { source: 'imf-portwatch', isMovingUp: true, isReliable: true, ageMinutes: 60 },
    { source: 'eia', isMovingUp: true, isReliable: true, ageMinutes: 120 },
  ]);

  assert.equal(result.statusBand, 'high');
  assert.equal(result.confidenceBand, 'high');
  assert.equal(result.freshnessState, 'fresh');
  assert.equal(result.evidenceState, 'confirmed');
});

test('deriveEvidenceState returns mixed when reliable datasets conflict', () => {
  const mixed = deriveEvidenceState(
    [
      { source: 'acled', isMovingUp: true, isReliable: true, ageMinutes: 50 },
      { source: 'gdelt', isMovingUp: false, isReliable: true, ageMinutes: 30 },
    ],
    'medium',
  );

  assert.equal(mixed, 'mixed');
});
