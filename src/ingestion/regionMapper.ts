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

const PROXIMITY_BUFFER_METERS = 75_000;
const MARITIME_BUFFER_METERS = 200_000;

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
    return resolveRegionHint(db, input.regionHint);
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

  const byProximity = await db.query<RegionIdRow>(
    `WITH point AS (
       SELECT ST_SetSRID(ST_Point($1::double precision, $2::double precision), 4326)::geography AS geom
     )
     SELECT r.id
     FROM regions r
     CROSS JOIN point p
     WHERE ST_DWithin(
       r.geometry,
       p.geom,
       CASE WHEN r.type = 'maritime' THEN $3::double precision ELSE $4::double precision END
     )
     ORDER BY
       CASE r.type
         WHEN 'chokepoint' THEN 0
         WHEN 'maritime' THEN 1
         ELSE 2
       END,
       ST_Distance(r.geometry, p.geom),
       r.id
     LIMIT 3`,
    [input.longitude, input.latitude, MARITIME_BUFFER_METERS, PROXIMITY_BUFFER_METERS],
  );

  if (byProximity.rows.length > 0) {
    return [...new Set(byProximity.rows.map((row) => row.id))];
  }

  return resolveRegionHint(db, input.regionHint);
}

async function resolveRegionHint(db: QueryableDb, regionHint?: string): Promise<number[]> {
  const normalizedRegionHint = normalizeHint(regionHint);
  if (!normalizedRegionHint) return [];

  const hintedRows = await db.query<RegionIdRow>(
    'SELECT id FROM regions WHERE lower(slug) = $1 OR lower(name) = $1 LIMIT 1',
    [normalizedRegionHint],
  );

  return hintedRows.rows[0] ? [hintedRows.rows[0].id] : [];
}
