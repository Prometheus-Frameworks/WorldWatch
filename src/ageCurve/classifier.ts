import {
  COMPONENT_WEIGHTS,
  FALLBACK_PEAK_WINDOW,
  LOW_SAMPLE_SIZE_THRESHOLD,
  MODIFIER_BOUNDS,
  POSITION_PEAK_WINDOWS,
  POSITION_THRESHOLDS,
} from './config.ts';
import type { AgeCurveInput, AgeCurveResult, ComponentAssessment, PeakWindow, PositionCode, StageLabel } from './types.ts';
import { buildReasonSummary } from './reasons.ts';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getPeakWindow(position: PositionCode): PeakWindow {
  return POSITION_PEAK_WINDOWS[position] ?? FALLBACK_PEAK_WINDOW;
}

export function classifyAgeStage(position: PositionCode, age: number): StageLabel {
  const peakWindow = getPeakWindow(position);

  if (age < peakWindow.start) return 'development';
  if (age <= peakWindow.end) return 'peak';
  if (age <= peakWindow.end + 4) return 'experienced';
  return 'late_career';
}

function classifyComponent(position: PositionCode, metric: ComponentAssessment['metric'], delta: number): ComponentAssessment {
  const thresholds = POSITION_THRESHOLDS[position];

  if (Math.abs(delta) >= thresholds.anomaly) {
    return { metric, delta, status: 'anomaly' };
  }

  if (delta >= thresholds.ahead) return { metric, delta, status: 'ahead' };
  if (delta <= thresholds.behind) return { metric, delta, status: 'behind' };

  return { metric, delta, status: 'on_track' };
}

function deriveModifier(stage: StageLabel, overallScore: number): number {
  const stageBias: Record<StageLabel, number> = {
    development: 0.012,
    peak: 0.01,
    experienced: -0.012,
    late_career: -0.028,
  };

  const raw = stageBias[stage] + overallScore * 0.05;
  return clamp(Number(raw.toFixed(3)), MODIFIER_BOUNDS.min, MODIFIER_BOUNDS.max);
}

export function evaluateAgeCurve(input: AgeCurveInput): AgeCurveResult {
  const stage = classifyAgeStage(input.position, input.age);
  const components: ComponentAssessment[] = [
    classifyComponent(input.position, 'production', input.productionDelta),
    classifyComponent(input.position, 'role', input.roleDelta),
    classifyComponent(input.position, 'efficiency', input.efficiencyDelta),
  ];

  const overallScore = Number((
    input.productionDelta * COMPONENT_WEIGHTS.production
    + input.roleDelta * COMPONENT_WEIGHTS.role
    + input.efficiencyDelta * COMPONENT_WEIGHTS.efficiency
  ).toFixed(3));

  const lowSampleWarning = input.sampleSize < LOW_SAMPLE_SIZE_THRESHOLD;
  const modifier = deriveModifier(stage, overallScore);

  return {
    playerId: input.playerId,
    position: input.position,
    age: input.age,
    stage,
    components,
    overallScore,
    modifier,
    reasons: buildReasonSummary({
      position: input.position,
      stage,
      components,
      overallScore,
      lowSampleWarning,
    }),
    lowSampleWarning,
  };
}
