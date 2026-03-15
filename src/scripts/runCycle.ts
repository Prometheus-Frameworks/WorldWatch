import { runWorldWatchCycle } from '../jobs/runWorldWatchCycle.ts';
import { loadCycleInputFromEnv, loadRuntimeConfig } from '../runtime/config.ts';
import { createLogger } from '../runtime/logger.ts';
import { createRuntimeDb } from '../runtime/postgres.ts';

const logger = createLogger('cycle-script');

async function main(): Promise<void> {
  const runtimeConfig = loadRuntimeConfig(process.env);
  const runtimeDb = await createRuntimeDb(runtimeConfig.databaseUrl);

  try {
    const result = await runWorldWatchCycle(loadCycleInputFromEnv(process.env, runtimeDb.db));
    logger.info({ event: 'cycle-script.complete', job_name: 'worldwatch_cycle', job_type: 'cycle', status: result.status, duration_ms: result.durationMs });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await runtimeDb.close();
  }
}

void main().catch((error) => {
  logger.error({ event: 'cycle-script.fatal', status: 'failed', message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
