export const NORMALIZED_SIGNAL_TYPES = {
  CONFLICT_FATALITIES: 'conflict.fatalities',
  CONFLICT_EVENT_INTENSITY: 'conflict.event_intensity',
  CONFLICT_TENSION: 'conflict.tension',
  NARRATIVE_MENTIONS: 'narrative.mentions',
  NARRATIVE_NEGATIVE_TONE: 'narrative.negative_tone',
  CHOKEPOINT_CONGESTION: 'chokepoint.congestion',
  CHOKEPOINT_DELAY_HOURS: 'chokepoint.delay_hours',
  CHOKEPOINT_TRANSIT_VOLUME: 'chokepoint.transit_volume',
  OIL_PRICE_USD: 'oil.price_usd',
  OIL_PRICE_VOLATILITY: 'oil.price_volatility',
  DISPLACEMENT_DELTA: 'displacement.delta',
  DISPLACEMENT_ACCELERATION: 'displacement.acceleration',
  THERMAL_ANOMALY_COUNT: 'thermal.anomaly_count',
  FIRE_ACTIVITY_INDEX: 'thermal.fire_activity_index',
} as const;

export type NormalizedSignalType =
  (typeof NORMALIZED_SIGNAL_TYPES)[keyof typeof NORMALIZED_SIGNAL_TYPES];

export interface NormalizedSignalDefinition {
  type: NormalizedSignalType;
  unit: string;
  domain:
    | 'conflictPressure'
    | 'chokepointStress'
    | 'oilShockRisk'
    | 'displacementAcceleration'
    | 'narrativeHeat';
  preferredSources: ReadonlyArray<'acled' | 'gdelt' | 'imf-portwatch' | 'eia' | 'unhcr' | 'nasa-firms'>;
}

export const NORMALIZED_SIGNAL_DEFINITIONS: ReadonlyArray<NormalizedSignalDefinition> = [
  {
    type: NORMALIZED_SIGNAL_TYPES.CONFLICT_FATALITIES,
    unit: 'people',
    domain: 'conflictPressure',
    preferredSources: ['acled'],
  },
  {
    type: NORMALIZED_SIGNAL_TYPES.CONFLICT_EVENT_INTENSITY,
    unit: 'index',
    domain: 'conflictPressure',
    preferredSources: ['acled'],
  },
  {
    type: NORMALIZED_SIGNAL_TYPES.CONFLICT_TENSION,
    unit: 'index',
    domain: 'conflictPressure',
    preferredSources: ['gdelt'],
  },
  {
    type: NORMALIZED_SIGNAL_TYPES.NARRATIVE_MENTIONS,
    unit: 'mentions',
    domain: 'narrativeHeat',
    preferredSources: ['gdelt'],
  },
  {
    type: NORMALIZED_SIGNAL_TYPES.NARRATIVE_NEGATIVE_TONE,
    unit: 'index',
    domain: 'narrativeHeat',
    preferredSources: ['gdelt'],
  },
  {
    type: NORMALIZED_SIGNAL_TYPES.CHOKEPOINT_CONGESTION,
    unit: 'index',
    domain: 'chokepointStress',
    preferredSources: ['imf-portwatch'],
  },
  {
    type: NORMALIZED_SIGNAL_TYPES.CHOKEPOINT_DELAY_HOURS,
    unit: 'hours',
    domain: 'chokepointStress',
    preferredSources: ['imf-portwatch'],
  },
  {
    type: NORMALIZED_SIGNAL_TYPES.CHOKEPOINT_TRANSIT_VOLUME,
    unit: 'vessels',
    domain: 'chokepointStress',
    preferredSources: ['imf-portwatch'],
  },
  {
    type: NORMALIZED_SIGNAL_TYPES.OIL_PRICE_USD,
    unit: 'usd_per_barrel',
    domain: 'oilShockRisk',
    preferredSources: ['eia'],
  },
  {
    type: NORMALIZED_SIGNAL_TYPES.OIL_PRICE_VOLATILITY,
    unit: 'index',
    domain: 'oilShockRisk',
    preferredSources: ['eia'],
  },
  {
    type: NORMALIZED_SIGNAL_TYPES.DISPLACEMENT_DELTA,
    unit: 'people',
    domain: 'displacementAcceleration',
    preferredSources: ['unhcr'],
  },
  {
    type: NORMALIZED_SIGNAL_TYPES.DISPLACEMENT_ACCELERATION,
    unit: 'index',
    domain: 'displacementAcceleration',
    preferredSources: ['unhcr'],
  },
  {
    type: NORMALIZED_SIGNAL_TYPES.THERMAL_ANOMALY_COUNT,
    unit: 'detections',
    domain: 'chokepointStress',
    preferredSources: ['nasa-firms'],
  },
  {
    type: NORMALIZED_SIGNAL_TYPES.FIRE_ACTIVITY_INDEX,
    unit: 'index',
    domain: 'conflictPressure',
    preferredSources: ['nasa-firms'],
  },
];
