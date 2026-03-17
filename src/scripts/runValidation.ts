import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { evaluateAgeCurve } from '../ageCurve/classifier.ts';
import { VALIDATION_CASES } from '../ageCurve/validationCases.ts';

function toBand(modifier: number): 'positive' | 'neutral' | 'negative' {
  if (modifier > 0.015) return 'positive';
  if (modifier < -0.015) return 'negative';
  return 'neutral';
}

async function main(): Promise<void> {
  const runs = VALIDATION_CASES.map((testCase) => {
    const result = evaluateAgeCurve(testCase.input);
    const stagePass = result.stage === testCase.expectedStage;
    const modifierBandPass = toBand(result.modifier) === testCase.expectedModifierBand;

    return {
      id: testCase.id,
      note: testCase.note,
      expectedStage: testCase.expectedStage,
      actualStage: result.stage,
      expectedModifierBand: testCase.expectedModifierBand,
      actualModifierBand: toBand(result.modifier),
      stagePass,
      modifierBandPass,
      pass: stagePass && modifierBandPass,
      lowSampleWarning: result.lowSampleWarning,
      reasons: result.reasons,
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    totalCases: runs.length,
    passCount: runs.filter((run) => run.pass).length,
    failCount: runs.filter((run) => !run.pass).length,
    runs,
  };

  const path = resolve(process.cwd(), 'artifacts/validation_report.json');
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
