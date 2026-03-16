export const EXPLAINABILITY_THRESHOLDS = {
  freshWindowMinutes: 360,
  staleHighImpactRecencyMinutes: 720,
  normalizedContributionFloor: 60,
  reliableSourceFloor: 0.7,
  reliabilitySpreadThreshold: 0.25,
} as const;
