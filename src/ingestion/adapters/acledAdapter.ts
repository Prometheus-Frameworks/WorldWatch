import { resolveRegionIds } from '../regionMapper.ts';
import { getSourceId, persistNormalizedSignals, persistRawEvent } from '../persistence.ts';
import type { PersistableSignal, QueryableDb } from '../types.ts';
import { NORMALIZED_SIGNAL_TYPES } from '../../shared/signals/types.ts';

export interface AcledEvent {
  event_id_cnty: string;
  event_date: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  admin1?: string;
  event_type?: string;
  fatalities?: number;
}

export async function ingestAcledEvents(
  db: QueryableDb,
  events: AcledEvent[],
  fetchedAt: Date = new Date(),
): Promise<void> {
  const sourceId = await getSourceId(db, 'acled');

  for (const event of events) {
    const eventTime = new Date(event.event_date);
    const rawEventId = await persistRawEvent(
      db,
      sourceId,
      event.event_id_cnty,
      event,
      fetchedAt,
      eventTime,
    );

    const regionIds = await resolveRegionIds(db, {
      latitude: event.latitude,
      longitude: event.longitude,
      regionHint: event.admin1 ?? event.country,
    });

    if (regionIds.length === 0) continue;

    const fatalities = Math.max(0, event.fatalities ?? 0);
    const intensity = Math.min(100, fatalities * 8 + (event.event_type ? 15 : 5));

    const baseSignals = [
      {
        signalType: NORMALIZED_SIGNAL_TYPES.CONFLICT_FATALITIES,
        value: fatalities,
        unit: 'people',
      },
      {
        signalType: NORMALIZED_SIGNAL_TYPES.CONFLICT_EVENT_INTENSITY,
        value: intensity,
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
          acled_event_type: event.event_type,
        },
      })),
    );

    await persistNormalizedSignals(db, signals);
  }
}
