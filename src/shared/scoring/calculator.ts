import {
  DEFAULT_COMPOSITE_WEIGHTS,
  FRESHNESS_THRESHOLDS_MINUTES,
  STATUS_BAND_THRESHOLDS,
} from './config.ts';
import type {
  CompositeWeights,
  ConfidenceBand,
  EvidenceState,
  FreshnessState,
  ScoreResult,
  SignalHealth,
  StatusBand,
  SubScores,
} from './types.ts';

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeCompositeScore(
  subScores: SubScores,
  weights: CompositeWeights = DEFAULT_COMPOSITE_WEIGHTS,
): number {
  const weighted =
    subScores.conflictPressure * weights.conflictPressure +
    subScores.chokepointStress * weights.chokepointStress +
    subScores.oilShockRisk * weights.oilShockRisk +
    subScores.displacementAcceleration * weights.displacementAcceleration +
    subScores.narrativeHeat * weights.narrativeHeat;

  return round2(clampScore(weighted));
}

export function deriveStatusBand(score: number): StatusBand {
  if (score >= STATUS_BAND_THRESHOLDS.critical) return 'critical';
  if (score >= STATUS_BAND_THRESHOLDS.high) return 'high';
  if (score >= STATUS_BAND_THRESHOLDS.elevated) return 'elevated';
  return 'low';
}

function getSignalCoverageWeight(signal: SignalHealth): number {
  const observedSignals = Math.max(1, signal.observedSignals ?? 1);
  return observedSignals;
}

export function deriveFreshnessState(signals: SignalHealth[]): FreshnessState {
  if (signals.length === 0) return 'stale';

  const reliabilityScoped = signals.filter((signal) => signal.isReliable);
  const relevantSignals = reliabilityScoped.length > 0 ? reliabilityScoped : signals;
  const domainSet = new Set(relevantSignals.map((signal) => signal.domain).filter(Boolean));
  const hasDomainCoverage = domainSet.size >= 2;

  if (hasDomainCoverage) {
    const newestByDomain = new Map<string, SignalHealth>();
    for (const signal of relevantSignals) {
      const domain = signal.domain;
      if (!domain) continue;
      const current = newestByDomain.get(domain);
      if (!current || signal.ageMinutes < current.ageMinutes) {
        newestByDomain.set(domain, signal);
      }
    }

    const domainAges = [...newestByDomain.values()].map((signal) => signal.ageMinutes).sort((a, b) => a - b);
    const domainAnchorAge = domainAges[Math.min(1, domainAges.length - 1)];
    if (domainAnchorAge <= FRESHNESS_THRESHOLDS_MINUTES.fresh) return 'fresh';
    if (domainAnchorAge <= FRESHNESS_THRESHOLDS_MINUTES.aging) return 'aging';
    return 'stale';
  }

  const totalCoverageWeight = relevantSignals.reduce((sum, signal) => sum + getSignalCoverageWeight(signal), 0);
  const freshWeight = relevantSignals
    .filter((signal) => signal.ageMinutes <= FRESHNESS_THRESHOLDS_MINUTES.fresh)
    .reduce((sum, signal) => sum + getSignalCoverageWeight(signal), 0);
  const agingWeight = relevantSignals
    .filter((signal) => signal.ageMinutes <= FRESHNESS_THRESHOLDS_MINUTES.aging)
    .reduce((sum, signal) => sum + getSignalCoverageWeight(signal), 0);

  if (freshWeight / totalCoverageWeight >= 0.6) return 'fresh';
  if (agingWeight / totalCoverageWeight >= 0.6) return 'aging';
  return 'stale';
}

export function deriveConfidenceBand(signals: SignalHealth[]): ConfidenceBand {
  if (signals.length < 2) return 'low';

  const reliable = signals.filter((signal) => signal.isReliable);
  const movingUp = reliable.filter((signal) => signal.isMovingUp);
  const reliableRatio = reliable.length / signals.length;

  if (reliable.length >= 3 && movingUp.length >= 2 && reliableRatio >= 0.6) {
    return 'high';
  }

  if (reliable.length >= 2 && movingUp.length >= 1) {
    return 'medium';
  }

  return 'low';
}

export function deriveEvidenceState(
  signals: SignalHealth[],
  confidenceBand: ConfidenceBand,
): EvidenceState {
  if (signals.length === 0) return 'unknown';

  const reliable = signals.filter((signal) => signal.isReliable);
  if (reliable.length < 2) return 'incomplete';

  const movementDirections = new Set(reliable.map((signal) => signal.isMovingUp));

  if (movementDirections.size === 1 && confidenceBand !== 'low') {
    return 'confirmed';
  }

  if (movementDirections.size > 1) {
    return 'mixed';
  }

  return 'incomplete';
}

export function calculateRegionScore(
  subScores: SubScores,
  signals: SignalHealth[],
  weights?: CompositeWeights,
): ScoreResult {
  const compositeScore = computeCompositeScore(subScores, weights);
  const confidenceBand = deriveConfidenceBand(signals);

  return {
    compositeScore,
    statusBand: deriveStatusBand(compositeScore),
    confidenceBand,
    freshnessState: deriveFreshnessState(signals),
    evidenceState: deriveEvidenceState(signals, confidenceBand),
  };
}
