import type { ComponentAssessment, PositionCode, ReasonSummary, StageLabel } from './types.ts';

interface ReasonInput {
  position: PositionCode;
  stage: StageLabel;
  components: ComponentAssessment[];
  overallScore: number;
  lowSampleWarning: boolean;
}

function metricReason(component: ComponentAssessment): string {
  if (component.status === 'anomaly') {
    return `${component.metric} is flagged as anomaly at ${component.delta.toFixed(2)} versus expected band.`;
  }
  if (component.status === 'ahead') {
    return `${component.metric} is ahead at ${component.delta.toFixed(2)} against positional baseline.`;
  }
  if (component.status === 'behind') {
    return `${component.metric} is behind at ${component.delta.toFixed(2)} versus positional baseline.`;
  }

  return `${component.metric} is on track at ${component.delta.toFixed(2)} inside positional tolerance.`;
}

export function buildReasonSummary(input: ReasonInput): ReasonSummary {
  const production = input.components.find((component) => component.metric === 'production');
  const role = input.components.find((component) => component.metric === 'role');
  const efficiency = input.components.find((component) => component.metric === 'efficiency');

  if (!production || !role || !efficiency) {
    throw new Error('Reason summary requires production, role, and efficiency components.');
  }

  const direction = input.overallScore >= 0.12
    ? 'clear positive curve signal'
    : input.overallScore <= -0.12
      ? 'clear negative curve signal'
      : 'balanced curve signal';

  const sampleText = input.lowSampleWarning
    ? 'Low sample warning is active; confidence should be reduced.'
    : 'Sample size is sufficient for normal confidence.';

  return {
    production: metricReason(production),
    role: metricReason(role),
    efficiency: metricReason(efficiency),
    overall: `Overall interpretation for ${input.position} in ${input.stage}: ${direction} (${input.overallScore.toFixed(2)}). ${sampleText}`,
  };
}
