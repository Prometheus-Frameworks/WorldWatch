import type { CompositeWeights } from './types.ts';

export const DEFAULT_COMPOSITE_WEIGHTS: CompositeWeights = {
  conflictPressure: 0.30,
  chokepointStress: 0.25,
  oilShockRisk: 0.20,
  displacementAcceleration: 0.15,
  narrativeHeat: 0.10,
};

export const STATUS_BAND_THRESHOLDS = {
  elevated: 35,
  high: 60,
  critical: 80,
} as const;

export const FRESHNESS_THRESHOLDS_MINUTES = {
  fresh: 180,
  aging: 720,
} as const;
