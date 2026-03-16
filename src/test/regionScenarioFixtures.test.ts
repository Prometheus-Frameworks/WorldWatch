import assert from 'node:assert/strict';
import test from 'node:test';

import {
  displacementLimitedSupportScenario,
  freshVsStaleUnevenCoverageScenario,
  highSeverityLowConfidenceScenario,
  mixedMultiDomainDisagreementScenario,
  narrativeLedSpikeFlatPhysicalScenario,
  singleSourceSpikeVsBroaderStaleSupportScenario,
} from './regionScenarioFixtures.ts';

test('region scenario fixtures expose canonical explainability edge-case shapes', () => {
  const freshVsStale = freshVsStaleUnevenCoverageScenario();
  const singleSpike = singleSourceSpikeVsBroaderStaleSupportScenario();
  const highSeverity = highSeverityLowConfidenceScenario();
  const narrativeLed = narrativeLedSpikeFlatPhysicalScenario();
  const mixedDisagreement = mixedMultiDomainDisagreementScenario();
  const displacementLimited = displacementLimitedSupportScenario();

  assert.equal(freshVsStale.signals.length >= 3, true);
  assert.equal(singleSpike.signals.filter((signal) => signal.ageMinutes > 700).length >= 2, true);
  assert.equal(Boolean(highSeverity.subScores), true);
  assert.equal(highSeverity.signals.some((signal) => signal.isMovingUp === false), true);
  assert.equal(narrativeLed.factors[0]?.domain, 'narrativeHeat');
  assert.equal(narrativeLed.factors.slice(1).every((factor) => factor.movement === 'flat'), true);
  assert.equal(mixedDisagreement.factors.some((factor) => factor.domain === 'conflictPressure' && factor.movement === 'down'), true);
  assert.equal(mixedDisagreement.factors.some((factor) => factor.domain === 'oilShockRisk' && factor.movement === 'up'), true);
  assert.equal(displacementLimited.factors.filter((factor) => factor.domain === 'displacementStress').length, 2);
});
