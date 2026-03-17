import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyAgeStage, evaluateAgeCurve } from './classifier.ts';

test('classifyAgeStage uses position-aware windows', () => {
  assert.equal(classifyAgeStage('FW', 23), 'development');
  assert.equal(classifyAgeStage('FW', 25), 'peak');
  assert.equal(classifyAgeStage('GK', 25), 'development');
  assert.equal(classifyAgeStage('GK', 31), 'peak');
});

test('evaluateAgeCurve returns deterministic reason summaries and low-sample warning', () => {
  const result = evaluateAgeCurve({
    playerId: 'case-1',
    position: 'MF',
    age: 30,
    productionDelta: -0.2,
    roleDelta: -0.03,
    efficiencyDelta: -0.14,
    sampleSize: 4,
  });

  assert.equal(result.lowSampleWarning, true);
  assert.equal(result.reasons.production.includes('behind'), true);
  assert.equal(result.reasons.overall.includes('Low sample warning is active'), true);
});
