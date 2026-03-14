import { ingestAcledEvents, type AcledEvent } from '../../ingestion/adapters/acledAdapter.ts';
import { insertJobRun } from '../jobRunLogger.ts';
import { defaultJsonFetcher, type SourceJobResult, type SourceRunnerContext } from './types.ts';

interface AcledApiResponse {
  data?: unknown[];
}

export interface RunAcledSourceJobInput extends SourceRunnerContext {
  url: string;
  headers?: Record<string, string>;
}

export async function runAcledSourceJob(input: RunAcledSourceJobInput): Promise<SourceJobResult> {
  const startedAt = new Date();

  try {
    const fetchJson = input.fetchJson ?? defaultJsonFetcher;
    const payload = await fetchJson(input.url, { headers: input.headers });
    const events = normalizeAcledResponse(payload);
    const stats = await ingestAcledEvents(input.db, events, input.fetchedAt ?? new Date());

    await insertJobRun(input.db, {
      jobName: 'acled',
      jobType: 'source',
      status: 'success',
      startedAt,
      finishedAt: new Date(),
      recordsProcessed: stats.recordsProcessed,
      metadata: {
        source: 'acled',
        url: input.url,
        mappedRegions: stats.mappedRegions,
        insertedSignals: stats.insertedSignals,
      },
    });

    return { sourceName: 'acled', url: input.url, ...stats };
  } catch (error) {
    await insertJobRun(input.db, {
      jobName: 'acled',
      jobType: 'source',
      status: 'failed',
      startedAt,
      finishedAt: new Date(),
      errorMessage: error instanceof Error ? error.message : String(error),
      metadata: {
        source: 'acled',
        url: input.url,
      },
    });

    throw error;
  }
}

function normalizeAcledResponse(payload: unknown): AcledEvent[] {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as AcledApiResponse | undefined)?.data)
      ? (payload as AcledApiResponse).data!
      : [];

  return rows
    .map((row) => row as Partial<AcledEvent>)
    .filter((row): row is Partial<AcledEvent> & Pick<AcledEvent, 'event_id_cnty' | 'event_date'> =>
      typeof row.event_id_cnty === 'string' && typeof row.event_date === 'string',
    )
    .map((row) => ({
      event_id_cnty: row.event_id_cnty,
      event_date: row.event_date,
      latitude: asNumber(row.latitude),
      longitude: asNumber(row.longitude),
      country: asString(row.country),
      admin1: asString(row.admin1),
      event_type: asString(row.event_type),
      fatalities: asNumber(row.fatalities),
    }));
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
