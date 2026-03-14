import { createWorldWatchApiServer } from '../api/server.ts';
import { loadRuntimeConfig } from '../runtime/config.ts';
import { createRuntimeDb } from '../runtime/postgres.ts';

async function main(): Promise<void> {
  const config = loadRuntimeConfig(process.env);
  const runtimeDb = await createRuntimeDb(config.databaseUrl);
  const server = createWorldWatchApiServer(runtimeDb.db);

  process.on('SIGINT', async () => {
    server.close();
    await runtimeDb.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    server.close();
    await runtimeDb.close();
    process.exit(0);
  });

  server.listen(config.port, () => {
    console.log(`WorldWatch API listening on :${config.port}`);
  });
}

void main();
