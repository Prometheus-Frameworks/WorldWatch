import { runWorldWatchCycle } from '../jobs/runWorldWatchCycle.ts';
import { loadCycleInputFromEnv, loadRuntimeConfig } from '../runtime/config.ts';
import { createLogger } from '../runtime/logger.ts';
import { createRuntimeDb } from '../runtime/postgres.ts';
import { createCycleScheduler } from '../runtime/scheduler.ts';
import { logServiceStartupSummary } from '../runtime/service.ts';

const logger = createLogger('scheduler-script');

async function main(): Promise<void> {
  const config = loadRuntimeConfig(process.env, { serviceRole: 'scheduler' });
  logServiceStartupSummary(logger, 'scheduler', config);
  const runtimeDb = await createRuntimeDb(config.databaseUrl);

  const scheduler = createCycleScheduler({
    intervalMinutes: config.cycleIntervalMinutes,
    runCycle: () => runWorldWatchCycle(loadCycleInputFromEnv(process.env, runtimeDb.db)),
    logger,
  });

  const shutdown = async (): Promise<void> => {
    await scheduler.shutdown();
    await runtimeDb.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });

  process.on('SIGTERM', () => {
    void shutdown();
  });

  await scheduler.start();
}

void main().catch((error) => {
  logger.error({
    event: 'scheduler.fatal',
    status: 'failed',
    service_role: 'scheduler',
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
