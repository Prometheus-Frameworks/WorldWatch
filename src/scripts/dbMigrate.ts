import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadRuntimeConfig } from '../runtime/config.ts';
import { createLogger } from '../runtime/logger.ts';
import { createRuntimeDb } from '../runtime/postgres.ts';

const logger = createLogger('db-migrations');

export interface MigrationDb {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

interface AppliedMigration {
  migration_name: string;
}

export async function runMigrations(db: MigrationDb, migrationsDir: string): Promise<string[]> {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id BIGSERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const files = (await readdir(migrationsDir))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort((a, b) => a.localeCompare(b));

  const applied = await db.query<AppliedMigration>('SELECT migration_name FROM schema_migrations ORDER BY migration_name ASC');
  const appliedSet = new Set(applied.rows.map((row) => row.migration_name));

  const newlyApplied: string[] = [];

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sql = await readFile(resolve(migrationsDir, file), 'utf8');
    await db.query('BEGIN');
    try {
      await db.query(sql);
      await db.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [file]);
      await db.query('COMMIT');
      newlyApplied.push(file);
      logger.info({ event: 'db.migration.applied', status: 'success', migration_name: file });
    } catch (error) {
      await db.query('ROLLBACK');
      logger.error({ event: 'db.migration.failed', status: 'failed', migration_name: file, message: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  return newlyApplied;
}

async function main(): Promise<void> {
  const config = loadRuntimeConfig(process.env);
  const runtimeDb = await createRuntimeDb(config.databaseUrl);

  try {
    const migrationsDir = resolve(process.cwd(), 'db/migrations');
    const applied = await runMigrations(runtimeDb.db, migrationsDir);

    if (applied.length === 0) {
      logger.info({ event: 'db.migration.none', message: 'No pending migrations.' });
    }
  } finally {
    await runtimeDb.close();
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (isMainModule()) {
  void main().catch((error) => {
    logger.error({ event: 'db.migration.fatal', status: 'failed', message: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  });
}
