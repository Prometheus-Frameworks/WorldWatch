import type { SignalHealth, SubScores } from '../shared/scoring/types.ts';

export interface ExplainabilityFactorFixture {
  signalType: string;
  source: string;
  domain: string;
  normalizedValue: number;
  recencyMinutes: number;
  sourceReliability: number;
  movement: 'up' | 'down' | 'flat';
}

export interface RegionScenarioFixture {
  subScores?: SubScores;
  signals: SignalHealth[];
  factors: ExplainabilityFactorFixture[];
}

function signalFixture(signal: SignalHealth): SignalHealth {
  return { ...signal };
}

function factorFixture(factor: ExplainabilityFactorFixture): ExplainabilityFactorFixture {
  return { ...factor };
}

export function freshVsStaleUnevenCoverageScenario(): RegionScenarioFixture {
  return {
    signals: [
      signalFixture({ source: 'acled', domain: 'conflictPressure', observedSignals: 1, isMovingUp: true, isReliable: true, ageMinutes: 15 }),
      signalFixture({ source: 'eia', domain: 'oilShockRisk', observedSignals: 1, isMovingUp: true, isReliable: true, ageMinutes: 800 }),
      signalFixture({ source: 'unhcr', domain: 'displacementAcceleration', observedSignals: 1, isMovingUp: true, isReliable: true, ageMinutes: 900 }),
    ],
    factors: [
      factorFixture({ signalType: 'conflict.fatalities', source: 'acled', domain: 'conflictPressure', normalizedValue: 83, recencyMinutes: 120, sourceReliability: 0.9, movement: 'up' }),
      factorFixture({ signalType: 'displacement.delta', source: 'unhcr', domain: 'displacementStress', normalizedValue: 62, recencyMinutes: 910, sourceReliability: 0.92, movement: 'up' }),
      factorFixture({ signalType: 'oil.price_usd', source: 'eia', domain: 'oilShockRisk', normalizedValue: 65, recencyMinutes: 500, sourceReliability: 0.9, movement: 'flat' }),
    ],
  };
}

export function singleSourceSpikeVsBroaderStaleSupportScenario(): RegionScenarioFixture {
  return {
    signals: [
      signalFixture({ source: 'acled', domain: 'conflictPressure', observedSignals: 1, isMovingUp: true, isReliable: true, ageMinutes: 10 }),
      signalFixture({ source: 'gdelt', domain: 'conflictPressure', observedSignals: 8, isMovingUp: true, isReliable: true, ageMinutes: 780 }),
      signalFixture({ source: 'nasa-firms', domain: 'conflictPressure', observedSignals: 7, isMovingUp: true, isReliable: true, ageMinutes: 820 }),
    ],
    factors: [
      factorFixture({ signalType: 'conflict.event_intensity', source: 'acled', domain: 'conflictPressure', normalizedValue: 84, recencyMinutes: 35, sourceReliability: 0.89, movement: 'up' }),
      factorFixture({ signalType: 'thermal.fire_activity_index', source: 'nasa_firms', domain: 'conflictPressure', normalizedValue: 78, recencyMinutes: 820, sourceReliability: 0.74, movement: 'up' }),
    ],
  };
}

export function highSeverityLowConfidenceScenario(): RegionScenarioFixture {
  return {
    subScores: {
      conflictPressure: 94,
      chokepointStress: 89,
      oilShockRisk: 85,
      displacementAcceleration: 82,
      narrativeHeat: 90,
    },
    signals: [
      signalFixture({ source: 'acled', domain: 'conflictPressure', observedSignals: 3, isMovingUp: true, isReliable: true, ageMinutes: 60 }),
      signalFixture({ source: 'imf-portwatch', domain: 'chokepointStress', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 75 }),
      signalFixture({ source: 'eia', domain: 'oilShockRisk', observedSignals: 2, isMovingUp: false, isReliable: true, ageMinutes: 80 }),
    ],
    factors: [
      factorFixture({ signalType: 'conflict.fatalities', source: 'acled', domain: 'conflictPressure', normalizedValue: 91, recencyMinutes: 60, sourceReliability: 0.91, movement: 'up' }),
      factorFixture({ signalType: 'chokepoint.delay_hours', source: 'imf-portwatch', domain: 'chokepointStress', normalizedValue: 87, recencyMinutes: 75, sourceReliability: 0.84, movement: 'up' }),
      factorFixture({ signalType: 'oil.price_volatility', source: 'eia', domain: 'oilShockRisk', normalizedValue: 82, recencyMinutes: 80, sourceReliability: 0.88, movement: 'down' }),
    ],
  };
}

export function narrativeLedSpikeFlatPhysicalScenario(): RegionScenarioFixture {
  return {
    signals: [
      signalFixture({ source: 'gdelt', domain: 'narrativeHeat', observedSignals: 4, isMovingUp: true, isReliable: true, ageMinutes: 30 }),
      signalFixture({ source: 'eia', domain: 'oilShockRisk', observedSignals: 2, isMovingUp: false, isReliable: true, ageMinutes: 55 }),
      signalFixture({ source: 'imf-portwatch', domain: 'chokepointStress', observedSignals: 2, isMovingUp: false, isReliable: true, ageMinutes: 70 }),
      signalFixture({ source: 'acled', domain: 'conflictPressure', observedSignals: 2, isMovingUp: false, isReliable: true, ageMinutes: 65 }),
    ],
    factors: [
      factorFixture({ signalType: 'narrative.mentions', source: 'gdelt', domain: 'narrativeHeat', normalizedValue: 84, recencyMinutes: 30, sourceReliability: 0.76, movement: 'up' }),
      factorFixture({ signalType: 'oil.price_usd', source: 'eia', domain: 'oilShockRisk', normalizedValue: 66, recencyMinutes: 55, sourceReliability: 0.88, movement: 'flat' }),
      factorFixture({ signalType: 'chokepoint.transit_volume', source: 'imf-portwatch', domain: 'chokepointStress', normalizedValue: 64, recencyMinutes: 70, sourceReliability: 0.84, movement: 'flat' }),
      factorFixture({ signalType: 'conflict.event_intensity', source: 'acled', domain: 'conflictPressure', normalizedValue: 62, recencyMinutes: 65, sourceReliability: 0.9, movement: 'flat' }),
    ],
  };
}

export function mixedMultiDomainDisagreementScenario(): RegionScenarioFixture {
  return {
    signals: [
      signalFixture({ source: 'acled', domain: 'conflictPressure', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 40 }),
      signalFixture({ source: 'gdelt', domain: 'conflictPressure', observedSignals: 2, isMovingUp: false, isReliable: true, ageMinutes: 380 }),
      signalFixture({ source: 'imf-portwatch', domain: 'chokepointStress', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 50 }),
      signalFixture({ source: 'eia', domain: 'oilShockRisk', observedSignals: 2, isMovingUp: false, isReliable: true, ageMinutes: 60 }),
    ],
    factors: [
      factorFixture({ signalType: 'conflict.fatalities', source: 'acled', domain: 'conflictPressure', normalizedValue: 79, recencyMinutes: 45, sourceReliability: 0.9, movement: 'up' }),
      factorFixture({ signalType: 'conflict.tension', source: 'gdelt', domain: 'conflictPressure', normalizedValue: 69, recencyMinutes: 390, sourceReliability: 0.65, movement: 'down' }),
      factorFixture({ signalType: 'chokepoint.delay_hours', source: 'imf-portwatch', domain: 'chokepointStress', normalizedValue: 78, recencyMinutes: 50, sourceReliability: 0.85, movement: 'up' }),
      factorFixture({ signalType: 'oil.price_volatility', source: 'eia', domain: 'oilShockRisk', normalizedValue: 76, recencyMinutes: 60, sourceReliability: 0.86, movement: 'down' }),
      factorFixture({ signalType: 'oil.price_usd', source: 'gdelt', domain: 'oilShockRisk', normalizedValue: 72, recencyMinutes: 900, sourceReliability: 0.58, movement: 'up' }),
    ],
  };
}

export function displacementLimitedSupportScenario(): RegionScenarioFixture {
  return {
    signals: [
      signalFixture({ source: 'unhcr', domain: 'displacementAcceleration', observedSignals: 2, isMovingUp: true, isReliable: true, ageMinutes: 210 }),
      signalFixture({ source: 'gdelt', domain: 'narrativeHeat', observedSignals: 1, isMovingUp: true, isReliable: false, ageMinutes: 40 }),
    ],
    factors: [
      factorFixture({ signalType: 'displacement.delta', source: 'unhcr', domain: 'displacementStress', normalizedValue: 79, recencyMinutes: 210, sourceReliability: 0.9, movement: 'up' }),
      factorFixture({ signalType: 'displacement.acceleration', source: 'unhcr', domain: 'displacementStress', normalizedValue: 77, recencyMinutes: 210, sourceReliability: 0.9, movement: 'up' }),
      factorFixture({ signalType: 'narrative.negative_tone', source: 'gdelt', domain: 'narrativeHeat', normalizedValue: 58, recencyMinutes: 40, sourceReliability: 0.65, movement: 'up' }),
    ],
  };
}
