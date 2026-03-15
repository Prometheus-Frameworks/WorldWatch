import { createWorldWatchApiServer } from '../api/server.ts';
import { runWorldWatchCycle, type RunWorldWatchCycleResult } from '../jobs/runWorldWatchCycle.ts';
import { loadCycleInputFromEnv, loadRuntimeConfig } from '../runtime/config.ts';
import { createLogger } from '../runtime/logger.ts';
import { createRuntimeDb } from '../runtime/postgres.ts';

const logger = createLogger('api-startup');

async function main(): Promise<void> {
  const config = loadRuntimeConfig(process.env);
  const runtimeDb = await createRuntimeDb(config.databaseUrl);

  let cycleInFlight: Promise<RunWorldWatchCycleResult> | null = null;
  const runCycleSafely = async () => {
    if (cycleInFlight) {
      throw new Error('cycle_overlap');
    }

    cycleInFlight = runWorldWatchCycle(loadCycleInputFromEnv(process.env, runtimeDb.db));
    try {
      return await cycleInFlight;
    } finally {
      cycleInFlight = null;
    }
  };

  const server = createWorldWatchApiServer(
    runtimeDb.db,
    {
      runCycle: runCycleSafely,
      isCycleRunning: () => Boolean(cycleInFlight),
    },
    config.deployment,
  );

  const shutdown = async (): Promise<void> => {
    logger.info({ event: 'api.shutdown.start', message: 'Shutting down API server.' });
    server.close();
    await runtimeDb.close();
    logger.info({ event: 'api.shutdown.end', message: 'API server shutdown complete.' });
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });

  process.on('SIGTERM', () => {
    void shutdown();
  });

  server.listen(config.port, () => {
    logger.info({ event: 'api.listen', message: `WorldWatch API listening on :${config.port}`, port: config.port, status: 'ready' });
  });
}

void main().catch((error) => {
  logger.error({ event: 'api.fatal', status: 'failed', message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
