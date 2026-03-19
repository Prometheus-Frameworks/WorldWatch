import { readFile } from 'node:fs/promises';

import type { QueryableDb } from '../ingestion/types.ts';

interface PoolLike {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  end(): Promise<void>;
}

export interface RuntimeDb {
  db: QueryableDb;
  close: () => Promise<void>;
  runSqlFile: (filePath: string) => Promise<void>;
}

export async function createRuntimeDb(databaseUrl: string): Promise<RuntimeDb> {
  const pool = await createPool(databaseUrl);
  await verifyDatabaseConnection(pool);

  return {
    db: {
      query: async <T>(sql: string, params?: unknown[]) => {
        const result = await pool.query<T>(sql, params);
        return { rows: result.rows };
      },
    },
    close: async () => {
      await pool.end();
    },
    runSqlFile: async (filePath: string) => {
      const sql = await readFile(filePath, 'utf8');
      await pool.query(sql);
    },
  };
}

async function createPool(databaseUrl: string): Promise<PoolLike> {
  const moduleName = 'pg';

  let pgModule: { default?: { Pool?: new (options: { connectionString: string }) => PoolLike }; Pool?: new (options: { connectionString: string }) => PoolLike };
  try {
    pgModule = await import(moduleName);
  } catch (error) {
    throw new Error(`Postgres driver not found. Install with: npm install pg. ${error instanceof Error ? error.message : String(error)}`);
  }

  const Pool = pgModule.Pool ?? pgModule.default?.Pool;
  if (!Pool) {
    throw new Error('Failed to load Pool from pg module.');
  }

  return new Pool({ connectionString: databaseUrl });
}

async function verifyDatabaseConnection(pool: PoolLike): Promise<void> {
  try {
    await pool.query('SELECT 1 AS ok');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to connect to Postgres using DATABASE_URL. ${message}`);
  }
}
