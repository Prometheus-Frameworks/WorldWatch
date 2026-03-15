import { resolveRegionIds } from '../regionMapper.ts';
import { getSourceId, persistNormalizedSignals, persistRawEvent } from '../persistence.ts';
import type { PersistableSignal, QueryableDb } from '../types.ts';
import { NORMALIZED_SIGNAL_TYPES } from '../../shared/signals/types.ts';

export interface UnhcrDisplacementRecord {
  record_id: string;
  observed_at: string;
  country?: string;
  admin1?: string;
  latitude?: number;
  longitude?: number;
  displaced_total?: number;
  displacement_delta?: number;
  displacement_acceleration?: number;
}

export interface IngestionStats {
  recordsProcessed: number;
  mappedRegions: number;
  insertedSignals: number;
}

export async function ingestUnhcrDisplacementRecords(
  db: QueryableDb,
  records: UnhcrDisplacementRecord[],
  fetchedAt: Date = new Date(),
): Promise<IngestionStats> {
  const sourceId = await getSourceId(db, 'unhcr');
  let mappedRegions = 0;
  let insertedSignals = 0;

  for (const record of records) {
    const eventTime = new Date(record.observed_at);
    const rawEventId = await persistRawEvent(
      db,
      sourceId,
      record.record_id,
      record,
      fetchedAt,
      eventTime,
    );

    const regionIds = await resolveRegionIds(db, {
      latitude: record.latitude,
      longitude: record.longitude,
      regionHint: record.admin1 ?? record.country,
    });

    if (regionIds.length === 0) continue;

    mappedRegions += regionIds.length;

    const delta = Math.max(0, record.displacement_delta ?? 0);
    const acceleration = Math.max(
      0,
      Math.min(
        100,
        record.displacement_acceleration ?? deriveAcceleration(delta, record.displaced_total),
      ),
    );

    const baseSignals = [
      {
        signalType: NORMALIZED_SIGNAL_TYPES.DISPLACEMENT_DELTA,
        value: delta,
        unit: 'people',
      },
      {
        signalType: NORMALIZED_SIGNAL_TYPES.DISPLACEMENT_ACCELERATION,
        value: acceleration,
        unit: 'index',
      },
    ] as const;

    const signals: PersistableSignal[] = regionIds.flatMap((regionId) =>
      baseSignals.map((signal) => ({
        regionId,
        sourceId,
        signalType: signal.signalType,
        value: signal.value,
        unit: signal.unit,
        eventTime,
        metadataJson: {
          raw_event_id: rawEventId,
          displaced_total: record.displaced_total ?? null,
        },
      })),
    );

    insertedSignals += signals.length;
    await persistNormalizedSignals(db, signals);
  }

  return { recordsProcessed: records.length, mappedRegions, insertedSignals };
}

function deriveAcceleration(delta: number, displacedTotal?: number): number {
  const denominator = Math.max(1, displacedTotal ?? delta ?? 1);
  return Math.min(100, (delta / denominator) * 100);
}
