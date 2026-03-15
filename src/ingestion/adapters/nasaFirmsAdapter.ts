import { resolveRegionIds } from '../regionMapper.ts';
import { getSourceId, persistNormalizedSignals, persistRawEvent } from '../persistence.ts';
import type { PersistableSignal, QueryableDb } from '../types.ts';
import { NORMALIZED_SIGNAL_TYPES } from '../../shared/signals/types.ts';

export interface NasaFirmsThermalRecord {
  event_id: string;
  observed_at: string;
  latitude?: number;
  longitude?: number;
  region?: string;
  satellite?: string;
  confidence?: number;
  brightness?: number;
  frp?: number;
}

export interface IngestionStats {
  recordsProcessed: number;
  mappedRegions: number;
  insertedSignals: number;
}

export async function ingestNasaFirmsThermalRecords(
  db: QueryableDb,
  records: NasaFirmsThermalRecord[],
  fetchedAt: Date = new Date(),
): Promise<IngestionStats> {
  const sourceId = await getSourceId(db, 'nasa-firms');
  let mappedRegions = 0;
  let insertedSignals = 0;

  for (const record of records) {
    const eventTime = new Date(record.observed_at);
    const rawEventId = await persistRawEvent(
      db,
      sourceId,
      record.event_id,
      record,
      fetchedAt,
      eventTime,
    );

    const regionIds = await resolveRegionIds(db, {
      latitude: record.latitude,
      longitude: record.longitude,
      regionHint: record.region,
    });

    if (regionIds.length === 0) continue;

    mappedRegions += regionIds.length;

    const anomalyCount = 1;
    const fireActivity = Math.max(0, Math.min(100, deriveFireIndex(record)));

    const baseSignals = [
      {
        signalType: NORMALIZED_SIGNAL_TYPES.THERMAL_ANOMALY_COUNT,
        value: anomalyCount,
        unit: 'detections',
      },
      {
        signalType: NORMALIZED_SIGNAL_TYPES.FIRE_ACTIVITY_INDEX,
        value: fireActivity,
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
          satellite: record.satellite,
          confidence: record.confidence ?? null,
          frp: record.frp ?? null,
        },
      })),
    );

    insertedSignals += signals.length;
    await persistNormalizedSignals(db, signals);
  }

  return { recordsProcessed: records.length, mappedRegions, insertedSignals };
}

function deriveFireIndex(record: NasaFirmsThermalRecord): number {
  const frpComponent = Math.max(0, record.frp ?? 0) * 1.5;
  const brightnessComponent = Math.max(0, ((record.brightness ?? 300) - 300) * 0.3);
  const confidenceComponent = Math.max(0, (record.confidence ?? 0) * 0.4);
  return frpComponent + brightnessComponent + confidenceComponent;
}
