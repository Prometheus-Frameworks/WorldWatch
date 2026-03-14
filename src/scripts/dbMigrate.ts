import { resolve } from 'node:path';

import { loadRuntimeConfig } from '../runtime/config.ts';
import { createRuntimeDb } from '../runtime/postgres.ts';

async function main(): Promise<void> {
  const config = loadRuntimeConfig(process.env);
  const runtimeDb = await createRuntimeDb(config.databaseUrl);

  try {
    await runtimeDb.runSqlFile(resolve(process.cwd(), 'db/schema.sql'));
    console.log('Applied schema migration: db/schema.sql');
  } finally {
    await runtimeDb.close();
  }
}

void main();
