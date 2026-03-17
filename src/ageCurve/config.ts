import type { PeakWindow, PositionCode, PositionThresholds } from './types.ts';

export const POSITION_THRESHOLDS: Record<PositionCode, PositionThresholds> = {
  FW: { ahead: 0.16, behind: -0.14, anomaly: 0.38 },
  MF: { ahead: 0.12, behind: -0.12, anomaly: 0.32 },
  DF: { ahead: 0.1, behind: -0.1, anomaly: 0.28 },
  GK: { ahead: 0.08, behind: -0.09, anomaly: 0.24 },
};

export const POSITION_PEAK_WINDOWS: Record<PositionCode, PeakWindow> = {
  FW: { start: 24, end: 27 },
  MF: { start: 25, end: 29 },
  DF: { start: 27, end: 31 },
  GK: { start: 29, end: 33 },
};

export const FALLBACK_PEAK_WINDOW: PeakWindow = { start: 26, end: 30 };

export const LOW_SAMPLE_SIZE_THRESHOLD = 8;

export const COMPONENT_WEIGHTS = {
  production: 0.45,
  role: 0.3,
  efficiency: 0.25,
} as const;

export const MODIFIER_BOUNDS = {
  min: -0.12,
  max: 0.12,
} as const;
