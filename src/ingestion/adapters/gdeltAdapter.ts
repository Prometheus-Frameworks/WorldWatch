import { resolveRegionIds } from '../regionMapper.ts';
import { getSourceId, persistNormalizedSignals, persistRawEvent } from '../persistence.ts';
import type { PersistableSignal, QueryableDb } from '../types.ts';
import { NORMALIZED_SIGNAL_TYPES } from '../../shared/signals/types.ts';

export interface GdeltEvent {
  GLOBALEVENTID: string;
  SQLDATE: string;
  ActionGeo_Lat?: number;
  ActionGeo_Long?: number;
  ActionGeo_CountryCode?: string;
  ActionGeo_FullName?: string;
  NumMentions?: number;
  AvgTone?: number;
  GoldsteinScale?: number;
}

export interface IngestionStats {
  recordsProcessed: number;
  mappedRegions: number;
  insertedSignals: number;
}

export async function ingestGdeltEvents(
  db: QueryableDb,
  events: GdeltEvent[],
  fetchedAt: Date = new Date(),
): Promise<IngestionStats> {
  const sourceId = await getSourceId(db, 'gdelt');
  let mappedRegions = 0;
  let insertedSignals = 0;

  for (const event of events) {
    const eventTime = parseSqlDate(event.SQLDATE);
    const rawEventId = await persistRawEvent(
      db,
      sourceId,
      event.GLOBALEVENTID,
      event,
      fetchedAt,
      eventTime,
    );

    const regionIds = await resolveRegionIds(db, {
      latitude: event.ActionGeo_Lat,
      longitude: event.ActionGeo_Long,
      regionHint: event.ActionGeo_FullName ?? event.ActionGeo_CountryCode,
    });

    if (regionIds.length === 0) continue;

    mappedRegions += regionIds.length;

    const mentions = Math.max(0, event.NumMentions ?? 0);
    const negativeTone = Math.max(0, -(event.AvgTone ?? 0));
    const tension = Math.max(0, -(event.GoldsteinScale ?? 0) * 10);

    const baseSignals = [
      { signalType: NORMALIZED_SIGNAL_TYPES.NARRATIVE_MENTIONS, value: mentions, unit: 'mentions' },
      {
        signalType: NORMALIZED_SIGNAL_TYPES.NARRATIVE_NEGATIVE_TONE,
        value: Math.min(100, negativeTone * 5),
        unit: 'index',
      },
      {
        signalType: NORMALIZED_SIGNAL_TYPES.CONFLICT_TENSION,
        value: Math.min(100, tension),
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
        },
      })),
    );

    insertedSignals += signals.length;
    await persistNormalizedSignals(db, signals);
  }

  return { recordsProcessed: events.length, mappedRegions, insertedSignals };
}

function parseSqlDate(value: string): Date {
  const normalized = value.trim();
  if (/^\d{8}$/.test(normalized)) {
    return new Date(
      `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}T00:00:00Z`,
    );
  }

  return new Date(normalized);
}
