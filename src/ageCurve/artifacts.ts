import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  FALLBACK_PEAK_WINDOW,
  MODIFIER_BOUNDS,
  POSITION_PEAK_WINDOWS,
  POSITION_THRESHOLDS,
} from './config.ts';
import { classifyAgeStage } from './classifier.ts';
import type { PositionCode, StageLabel } from './types.ts';

const POSITIONS: PositionCode[] = ['FW', 'MF', 'DF', 'GK'];
const STAGE_BASE: Record<StageLabel, number> = {
  development: 0.015,
  peak: 0.025,
  experienced: -0.015,
  late_career: -0.03,
};

function clamp(value: number): number {
  return Math.max(MODIFIER_BOUNDS.min, Math.min(MODIFIER_BOUNDS.max, value));
}

function ageDistancePenalty(position: PositionCode, age: number): number {
  const peakWindow = POSITION_PEAK_WINDOWS[position] ?? FALLBACK_PEAK_WINDOW;
  const center = (peakWindow.start + peakWindow.end) / 2;
  return Math.abs(age - center) * 0.004;
}

function buildPositionAgeModifiers(): Record<PositionCode, Record<string, number>> {
  const output = {} as Record<PositionCode, Record<string, number>>;

  for (const position of POSITIONS) {
    const byAge: Record<string, number> = {};

    for (let age = 18; age <= 38; age += 1) {
      const stage = classifyAgeStage(position, age);
      const rawModifier = STAGE_BASE[stage] - ageDistancePenalty(position, age);
      byAge[String(age)] = Number(clamp(rawModifier).toFixed(3));
    }

    output[position] = byAge;
  }

  return output;
}

export interface AgeCurveArtifacts {
  version: string;
  generatedAt: string;
  thresholdsByPosition: typeof POSITION_THRESHOLDS;
  peakWindowsByPosition: typeof POSITION_PEAK_WINDOWS;
  fallbackPeakWindow: typeof FALLBACK_PEAK_WINDOW;
  positionAgeModifiers: Record<PositionCode, Record<string, number>>;
}

export async function writeAgeCurveArtifacts(version = 'pr-4'): Promise<{ fullPath: string; tiberPath: string }> {
  const artifacts: AgeCurveArtifacts = {
    version,
    generatedAt: new Date().toISOString(),
    thresholdsByPosition: POSITION_THRESHOLDS,
    peakWindowsByPosition: POSITION_PEAK_WINDOWS,
    fallbackPeakWindow: FALLBACK_PEAK_WINDOW,
    positionAgeModifiers: buildPositionAgeModifiers(),
  };

  const fullPath = resolve(process.cwd(), 'artifacts/age_curve_reintegration_full.json');
  const tiberPath = resolve(process.cwd(), 'artifacts/tiber_age_modifiers.json');

  await writeFile(fullPath, `${JSON.stringify(artifacts, null, 2)}\n`);
  await writeFile(
    tiberPath,
    `${JSON.stringify({
      version: artifacts.version,
      generatedAt: artifacts.generatedAt,
      positionAgeModifiers: artifacts.positionAgeModifiers,
    }, null, 2)}\n`,
  );

  return { fullPath, tiberPath };
}
