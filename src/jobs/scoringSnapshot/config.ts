import type { CompositeWeights } from '../../shared/scoring/types.ts';

export interface SnapshotJobConfig {
  lookbackHours: number;
  alertDeltaThreshold: number;
  alertScoreThreshold: number;
  signalNormalization: Record<string, { max: number; invert?: boolean }>;
  subScoreSignalWeights: Record<keyof CompositeWeights, Record<string, number>>;
}

export const SNAPSHOT_JOB_CONFIG: SnapshotJobConfig = {
  lookbackHours: 48,
  alertDeltaThreshold: 10,
  alertScoreThreshold: 60,
  signalNormalization: {
    'conflict.fatalities': { max: 100 },
    'conflict.event_intensity': { max: 100 },
    'conflict.tension': { max: 100 },
    'narrative.mentions': { max: 500 },
    'narrative.negative_tone': { max: 100 },
    'chokepoint.congestion': { max: 100 },
    'chokepoint.delay_hours': { max: 72 },
    'chokepoint.transit_volume': { max: 100 },
    'oil.price_usd': { max: 160 },
    'oil.price_volatility': { max: 100 },
  },
  subScoreSignalWeights: {
    conflictPressure: {
      'conflict.fatalities': 0.45,
      'conflict.event_intensity': 0.3,
      'conflict.tension': 0.25,
    },
    chokepointStress: {
      'chokepoint.congestion': 0.4,
      'chokepoint.delay_hours': 0.35,
      'chokepoint.transit_volume': 0.25,
    },
    oilShockRisk: {
      'oil.price_usd': 0.6,
      'oil.price_volatility': 0.4,
    },
    displacementAcceleration: {
      'conflict.fatalities': 0.7,
      'narrative.mentions': 0.3,
    },
    narrativeHeat: {
      'narrative.mentions': 0.5,
      'narrative.negative_tone': 0.5,
    },
  },
};
