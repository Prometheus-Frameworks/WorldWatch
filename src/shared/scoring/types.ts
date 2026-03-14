export type StatusBand = 'low' | 'elevated' | 'high' | 'critical';
export type ConfidenceBand = 'low' | 'medium' | 'high';
export type FreshnessState = 'fresh' | 'aging' | 'stale';
export type EvidenceState = 'confirmed' | 'mixed' | 'incomplete' | 'unknown';

export interface SubScores {
  conflictPressure: number;
  chokepointStress: number;
  oilShockRisk: number;
  displacementAcceleration: number;
  narrativeHeat: number;
}

export interface SignalHealth {
  source: 'acled' | 'gdelt' | 'imf-portwatch' | 'eia' | 'unhcr' | 'nasa-firms';
  isMovingUp: boolean;
  isReliable: boolean;
  ageMinutes: number;
}

export interface CompositeWeights {
  conflictPressure: number;
  chokepointStress: number;
  oilShockRisk: number;
  displacementAcceleration: number;
  narrativeHeat: number;
}

export interface ScoreResult {
  compositeScore: number;
  statusBand: StatusBand;
  confidenceBand: ConfidenceBand;
  freshnessState: FreshnessState;
  evidenceState: EvidenceState;
}
