import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveRegionIds } from './regionMapper.ts';
import type { QueryableDb } from './types.ts';

test('resolveRegionIds falls back to proximity mapping when point does not intersect regions', async () => {
  const sqlCalls: string[] = [];

  const db: QueryableDb = {
    async query<T>(sql: string): Promise<{ rows: T[] }> {
      sqlCalls.push(sql);

      if (sql.includes('ST_Intersects')) {
        return { rows: [] as T[] };
      }

      if (sql.includes('ST_DWithin')) {
        return { rows: [{ id: 42 }] as T[] };
      }

      return { rows: [] as T[] };
    },
  };

  const regionIds = await resolveRegionIds(db, { latitude: 10.1, longitude: 45.7 });

  assert.deepEqual(regionIds, [42]);
  assert.equal(sqlCalls.some((sql) => sql.includes('ST_DWithin')), true);
});

test('resolveRegionIds maps by region hint when geometry coordinates are not available', async () => {
  const db: QueryableDb = {
    async query<T>(sql: string): Promise<{ rows: T[] }> {
      if (sql.includes('SELECT id FROM regions WHERE lower(slug)')) {
        return { rows: [{ id: 77 }] as T[] };
      }
      return { rows: [] as T[] };
    },
  };

  const regionIds = await resolveRegionIds(db, { regionHint: 'Sudan' });
  assert.deepEqual(regionIds, [77]);
});
