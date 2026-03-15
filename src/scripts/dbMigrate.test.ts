import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { runMigrations } from './dbMigrate.ts';

test('runMigrations applies only unapplied migrations and tracks them', async () => {
  const dir = join(tmpdir(), `ww-migrations-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, '001_baseline.sql'), 'CREATE TABLE test_a(id INT);');
  await writeFile(join(dir, '002_add_table.sql'), 'CREATE TABLE test_b(id INT);');

  const applied = new Set<string>(['001_baseline.sql']);
  const executedSql: string[] = [];

  const db = {
    async query<T>(sql: string, params?: unknown[]) {
      executedSql.push(sql);
      if (sql.startsWith('SELECT migration_name')) {
        return { rows: [{ migration_name: '001_baseline.sql' }] as T[] };
      }
      if (sql.startsWith('INSERT INTO schema_migrations')) {
        applied.add(String(params?.[0]));
        return { rows: [] as T[] };
      }
      return { rows: [] as T[] };
    },
  };

  const newlyApplied = await runMigrations(db, dir);

  assert.deepEqual(newlyApplied, ['002_add_table.sql']);
  assert.equal(applied.has('002_add_table.sql'), true);
  assert.equal(executedSql.some((sql) => sql === 'BEGIN'), true);
  assert.equal(executedSql.some((sql) => sql === 'COMMIT'), true);
});
