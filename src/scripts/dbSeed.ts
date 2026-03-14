import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { loadRuntimeConfig } from '../runtime/config.ts';
import { createRuntimeDb } from '../runtime/postgres.ts';

async function main(): Promise<void> {
  const config = loadRuntimeConfig(process.env);
  const runtimeDb = await createRuntimeDb(config.databaseUrl);

  try {
    const seedsDir = resolve(process.cwd(), 'db/seeds');
    const files = (await readdir(seedsDir))
      .filter((name) => name.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      await runtimeDb.runSqlFile(resolve(seedsDir, file));
      console.log(`Applied seed: db/seeds/${file}`);
    }
  } finally {
    await runtimeDb.close();
  }
}

void main();
