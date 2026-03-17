import type { ValidationCase } from './types.ts';

export const VALIDATION_CASES: ValidationCase[] = [
  {
    id: 'fw-breakout-24',
    note: 'Young forward breakout with strong production and efficiency.',
    input: {
      playerId: 'fw-breakout-24',
      position: 'FW',
      age: 24,
      productionDelta: 0.22,
      roleDelta: 0.12,
      efficiencyDelta: 0.2,
      sampleSize: 16,
    },
    expectedStage: 'peak',
    expectedModifierBand: 'positive',
  },
  {
    id: 'mf-stable-28',
    note: 'Prime midfielder with balanced signals.',
    input: {
      playerId: 'mf-stable-28',
      position: 'MF',
      age: 28,
      productionDelta: 0.02,
      roleDelta: 0.04,
      efficiencyDelta: 0.01,
      sampleSize: 14,
    },
    expectedStage: 'peak',
    expectedModifierBand: 'neutral',
  },
  {
    id: 'df-decline-34',
    note: 'Older defender showing broad decline.',
    input: {
      playerId: 'df-decline-34',
      position: 'DF',
      age: 34,
      productionDelta: -0.18,
      roleDelta: -0.12,
      efficiencyDelta: -0.14,
      sampleSize: 13,
    },
    expectedStage: 'experienced',
    expectedModifierBand: 'negative',
  },
  {
    id: 'gk-low-sample-22',
    note: 'Young goalkeeper with limited minutes and warning expected.',
    input: {
      playerId: 'gk-low-sample-22',
      position: 'GK',
      age: 22,
      productionDelta: 0.04,
      roleDelta: -0.01,
      efficiencyDelta: 0.03,
      sampleSize: 5,
    },
    expectedStage: 'development',
    expectedModifierBand: 'neutral',
  },
];
