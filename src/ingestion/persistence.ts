import type { QueryableDb, PersistableSignal } from './types.ts';

interface SourceRow {
  id: number;
}

interface RawEventRow {
  id: number;
}

const sourceCache = new Map<string, number>();

export async function getSourceId(db: QueryableDb, sourceName: string): Promise<number> {
  const cached = sourceCache.get(sourceName);
  if (cached) return cached;

  const result = await db.query<SourceRow>(
    'SELECT id FROM data_sources WHERE name = $1 LIMIT 1',
    [sourceName],
  );

  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error(`Unknown source '${sourceName}'. Seed data_sources first.`);
  }

  sourceCache.set(sourceName, id);
  return id;
}

export async function persistRawEvent(
  db: QueryableDb,
  sourceId: number,
  externalId: string,
  payloadJson: unknown,
  fetchedAt: Date,
  eventTime: Date,
): Promise<number> {
  const result = await db.query<RawEventRow>(
    `INSERT INTO raw_events (source_id, external_id, payload_json, fetched_at, event_time)
     VALUES ($1, $2, $3::jsonb, $4, $5)
     ON CONFLICT (source_id, external_id) DO UPDATE
     SET payload_json = EXCLUDED.payload_json,
         fetched_at = EXCLUDED.fetched_at,
         event_time = EXCLUDED.event_time
     RETURNING id`,
    [sourceId, externalId, JSON.stringify(payloadJson), fetchedAt.toISOString(), eventTime.toISOString()],
  );

  return result.rows[0].id;
}

export async function persistNormalizedSignals(
  db: QueryableDb,
  signals: PersistableSignal[],
): Promise<void> {
  for (const signal of signals) {
    await db.query(
      `INSERT INTO normalized_signals (
         region_id, source_id, signal_type, value, unit, event_time, metadata_json
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (region_id, source_id, signal_type, event_time) DO UPDATE
       SET value = EXCLUDED.value,
           unit = EXCLUDED.unit,
           metadata_json = EXCLUDED.metadata_json,
           ingested_at = NOW()`,
      [
        signal.regionId,
        signal.sourceId,
        signal.signalType,
        signal.value,
        signal.unit,
        signal.eventTime.toISOString(),
        JSON.stringify(signal.metadataJson ?? {}),
      ],
    );
  }
}
