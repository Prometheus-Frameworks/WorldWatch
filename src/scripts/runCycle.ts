import { runWorldWatchCycle } from '../jobs/runWorldWatchCycle.ts';
import { loadCycleInputFromEnv, loadRuntimeConfig } from '../runtime/config.ts';
import { createRuntimeDb } from '../runtime/postgres.ts';

async function main(): Promise<void> {
  const runtimeConfig = loadRuntimeConfig(process.env);
  const runtimeDb = await createRuntimeDb(runtimeConfig.databaseUrl);

  try {
    const result = await runWorldWatchCycle(loadCycleInputFromEnv(process.env, runtimeDb.db));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await runtimeDb.close();
  }
}

void main();
