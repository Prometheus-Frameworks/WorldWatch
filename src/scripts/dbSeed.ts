import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { loadRuntimeConfig } from '../runtime/config.ts';
import { createLogger } from '../runtime/logger.ts';
import { createRuntimeDb } from '../runtime/postgres.ts';
import { logServiceStartupSummary } from '../runtime/service.ts';

const logger = createLogger('db-seed');

async function main(): Promise<void> {
  const config = loadRuntimeConfig(process.env, { serviceRole: 'seed' });
  logServiceStartupSummary(logger, 'seed', config);
  const runtimeDb = await createRuntimeDb(config.databaseUrl);

  try {
    const seedsDir = resolve(process.cwd(), 'db/seeds');
    const files = (await readdir(seedsDir))
      .filter((name) => name.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      await runtimeDb.runSqlFile(resolve(seedsDir, file));
      logger.info({ event: 'db.seed.applied', message: `Applied seed: db/seeds/${file}`, seed_name: file, status: 'success' });
    }
  } finally {
    await runtimeDb.close();
  }
}

void main().catch((error) => {
  logger.error({ event: 'db.seed.fatal', status: 'failed', message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
