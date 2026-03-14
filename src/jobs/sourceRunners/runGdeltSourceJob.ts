import { ingestGdeltEvents, type GdeltEvent } from '../../ingestion/adapters/gdeltAdapter.ts';
import { defaultJsonFetcher, type SourceRunnerContext } from './types.ts';

interface GdeltApiResponse {
  events?: unknown[];
}

export interface RunGdeltSourceJobInput extends SourceRunnerContext {
  url: string;
  headers?: Record<string, string>;
}

export async function runGdeltSourceJob(input: RunGdeltSourceJobInput): Promise<void> {
  const fetchJson = input.fetchJson ?? defaultJsonFetcher;
  const payload = await fetchJson(input.url, { headers: input.headers });
  const events = normalizeGdeltResponse(payload);
  await ingestGdeltEvents(input.db, events, input.fetchedAt ?? new Date());
}

function normalizeGdeltResponse(payload: unknown): GdeltEvent[] {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as GdeltApiResponse | undefined)?.events)
      ? (payload as GdeltApiResponse).events!
      : [];

  return rows
    .map((row) => row as Partial<GdeltEvent>)
    .filter((row): row is Partial<GdeltEvent> & Pick<GdeltEvent, 'GLOBALEVENTID' | 'SQLDATE'> =>
      typeof row.GLOBALEVENTID === 'string' && typeof row.SQLDATE === 'string',
    )
    .map((row) => ({
      GLOBALEVENTID: row.GLOBALEVENTID,
      SQLDATE: row.SQLDATE,
      ActionGeo_Lat: asNumber(row.ActionGeo_Lat),
      ActionGeo_Long: asNumber(row.ActionGeo_Long),
      ActionGeo_CountryCode: asString(row.ActionGeo_CountryCode),
      ActionGeo_FullName: asString(row.ActionGeo_FullName),
      NumMentions: asNumber(row.NumMentions),
      AvgTone: asNumber(row.AvgTone),
      GoldsteinScale: asNumber(row.GoldsteinScale),
    }));
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
