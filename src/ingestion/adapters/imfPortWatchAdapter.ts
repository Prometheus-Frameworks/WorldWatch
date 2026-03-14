import { resolveRegionIds } from '../regionMapper.ts';
import { getSourceId, persistNormalizedSignals, persistRawEvent } from '../persistence.ts';
import type { PersistableSignal, QueryableDb } from '../types.ts';
import { NORMALIZED_SIGNAL_TYPES } from '../../shared/signals/types.ts';

export interface ImfPortWatchObservation {
  observation_id: string;
  observed_at: string;
  chokepoint?: string;
  port_name?: string;
  latitude?: number;
  longitude?: number;
  congestion_index?: number;
  transit_delay_hours?: number;
  transit_count?: number;
}

export async function ingestImfPortWatchObservations(
  db: QueryableDb,
  observations: ImfPortWatchObservation[],
  fetchedAt: Date = new Date(),
): Promise<void> {
  const sourceId = await getSourceId(db, 'imf-portwatch');

  for (const observation of observations) {
    const eventTime = new Date(observation.observed_at);
    const rawEventId = await persistRawEvent(
      db,
      sourceId,
      observation.observation_id,
      observation,
      fetchedAt,
      eventTime,
    );

    const regionIds = await resolveRegionIds(db, {
      latitude: observation.latitude,
      longitude: observation.longitude,
      chokepointHint: observation.chokepoint,
      regionHint: observation.port_name,
    });

    if (regionIds.length === 0) continue;

    const congestion = Math.min(100, Math.max(0, observation.congestion_index ?? 0));
    const delayHours = Math.max(0, observation.transit_delay_hours ?? 0);
    const transitVolumeStress = Math.min(
      100,
      Math.max(0, 100 - Math.min(100, (observation.transit_count ?? 0) / 2)),
    );

    const baseSignals = [
      {
        signalType: NORMALIZED_SIGNAL_TYPES.CHOKEPOINT_CONGESTION,
        value: congestion,
        unit: 'index',
      },
      {
        signalType: NORMALIZED_SIGNAL_TYPES.CHOKEPOINT_DELAY_HOURS,
        value: delayHours,
        unit: 'hours',
      },
      {
        signalType: NORMALIZED_SIGNAL_TYPES.CHOKEPOINT_TRANSIT_VOLUME,
        value: transitVolumeStress,
        unit: 'vessels',
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
          chokepoint: observation.chokepoint,
        },
      })),
    );

    await persistNormalizedSignals(db, signals);
  }
}
