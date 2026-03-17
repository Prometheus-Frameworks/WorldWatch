export type PositionCode = 'FW' | 'MF' | 'DF' | 'GK';

export type MetricName = 'production' | 'role' | 'efficiency' | 'overall';

export interface PositionThresholds {
  ahead: number;
  behind: number;
  anomaly: number;
}

export interface PeakWindow {
  start: number;
  end: number;
}

export type StageLabel = 'development' | 'peak' | 'experienced' | 'late_career';

export interface AgeCurveInput {
  playerId: string;
  position: PositionCode;
  age: number;
  productionDelta: number;
  roleDelta: number;
  efficiencyDelta: number;
  sampleSize: number;
}

export interface ComponentAssessment {
  metric: Exclude<MetricName, 'overall'>;
  delta: number;
  status: 'ahead' | 'on_track' | 'behind' | 'anomaly';
}

export interface ReasonSummary {
  production: string;
  role: string;
  efficiency: string;
  overall: string;
}

export interface AgeCurveResult {
  playerId: string;
  position: PositionCode;
  age: number;
  stage: StageLabel;
  components: ComponentAssessment[];
  overallScore: number;
  modifier: number;
  reasons: ReasonSummary;
  lowSampleWarning: boolean;
}

export interface ValidationCase {
  id: string;
  note: string;
  input: AgeCurveInput;
  expectedStage: StageLabel;
  expectedModifierBand: 'positive' | 'neutral' | 'negative';
}
