import type { QueryableDb, RegionMappingInput } from './types.ts';

const CHOKEPOINT_OVERRIDES: Record<string, string> = {
  'strait of hormuz': 'strait-of-hormuz',
  hormuz: 'strait-of-hormuz',
  'suez canal': 'suez-canal',
  suez: 'suez-canal',
  'bab el-mandeb': 'bab-el-mandeb',
  'panama canal': 'panama-canal',
  panama: 'panama-canal',
};

interface RegionIdRow {
  id: number;
}

function normalizeHint(value?: string): string | undefined {
  return value?.trim().toLowerCase();
}

export async function resolveRegionIds(
  db: QueryableDb,
  input: RegionMappingInput,
): Promise<number[]> {
  const normalizedChokepoint = normalizeHint(input.chokepointHint);
  const overrideSlug = normalizedChokepoint
    ? CHOKEPOINT_OVERRIDES[normalizedChokepoint]
    : undefined;

  if (overrideSlug) {
    const overrideRows = await db.query<RegionIdRow>(
      'SELECT id FROM regions WHERE slug = $1 LIMIT 1',
      [overrideSlug],
    );

    if (overrideRows.rows[0]) {
      return [overrideRows.rows[0].id];
    }
  }

  if (input.latitude === undefined || input.longitude === undefined) {
    return [];
  }

  const byIntersection = await db.query<RegionIdRow>(
    `SELECT id
     FROM regions
     WHERE ST_Intersects(
       geometry::geometry,
       ST_SetSRID(ST_Point($1::double precision, $2::double precision), 4326)
     )
     ORDER BY CASE WHEN type = 'chokepoint' THEN 0 ELSE 1 END, id`,
    [input.longitude, input.latitude],
  );

  if (byIntersection.rows.length > 0) {
    return [...new Set(byIntersection.rows.map((row) => row.id))];
  }

  const regionHint = normalizeHint(input.regionHint);
  if (!regionHint) return [];

  const hintedRows = await db.query<RegionIdRow>(
    'SELECT id FROM regions WHERE lower(slug) = $1 OR lower(name) = $1 LIMIT 1',
    [regionHint],
  );

  return hintedRows.rows[0] ? [hintedRows.rows[0].id] : [];
}
