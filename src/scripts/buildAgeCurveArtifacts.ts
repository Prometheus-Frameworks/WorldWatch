import { writeAgeCurveArtifacts } from '../ageCurve/artifacts.ts';

async function main(): Promise<void> {
  const paths = await writeAgeCurveArtifacts('pr-4');
  console.log(JSON.stringify(paths, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
