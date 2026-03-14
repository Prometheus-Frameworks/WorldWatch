import { resolveRegionIds } from '../regionMapper.ts';
import { getSourceId, persistNormalizedSignals, persistRawEvent } from '../persistence.ts';
import type { PersistableSignal, QueryableDb } from '../types.ts';
import { NORMALIZED_SIGNAL_TYPES } from '../../shared/signals/types.ts';

export interface EiaReading {
  series_id: string;
  period: string;
  value: number;
  region?: string;
  latitude?: number;
  longitude?: number;
  rolling_stddev?: number;
}

export interface IngestionStats {
  recordsProcessed: number;
  mappedRegions: number;
  insertedSignals: number;
}

export async function ingestEiaReadings(
  db: QueryableDb,
  readings: EiaReading[],
  fetchedAt: Date = new Date(),
): Promise<IngestionStats> {
  const sourceId = await getSourceId(db, 'eia');
  let mappedRegions = 0;
  let insertedSignals = 0;

  for (const reading of readings) {
    const eventTime = new Date(reading.period);
    const externalId = `${reading.series_id}:${reading.period}`;
    const rawEventId = await persistRawEvent(
      db,
      sourceId,
      externalId,
      reading,
      fetchedAt,
      eventTime,
    );

    const regionIds = await resolveRegionIds(db, {
      latitude: reading.latitude,
      longitude: reading.longitude,
      regionHint: reading.region,
    });

    if (regionIds.length === 0) continue;

    mappedRegions += regionIds.length;

    const price = Math.max(0, reading.value);
    const volatility = Math.min(100, Math.max(0, (reading.rolling_stddev ?? 0) * 10));

    const baseSignals = [
      { signalType: NORMALIZED_SIGNAL_TYPES.OIL_PRICE_USD, value: price, unit: 'usd_per_barrel' },
      {
        signalType: NORMALIZED_SIGNAL_TYPES.OIL_PRICE_VOLATILITY,
        value: volatility,
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
          series_id: reading.series_id,
        },
      })),
    );

    insertedSignals += signals.length;
    await persistNormalizedSignals(db, signals);
  }

  return { recordsProcessed: readings.length, mappedRegions, insertedSignals };
}
