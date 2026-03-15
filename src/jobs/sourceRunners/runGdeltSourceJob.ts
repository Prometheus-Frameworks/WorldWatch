import { ingestGdeltEvents, type GdeltEvent } from '../../ingestion/adapters/gdeltAdapter.ts';
import { createLogger } from '../../runtime/logger.ts';
import { insertJobRun } from '../jobRunLogger.ts';
import { defaultJsonFetcher, type SourceJobResult, type SourceRunnerContext } from './types.ts';

const logger = createLogger('source-runner');

interface GdeltApiResponse {
  events?: unknown[];
}

export interface RunGdeltSourceJobInput extends SourceRunnerContext {
  url: string;
  headers?: Record<string, string>;
}

export async function runGdeltSourceJob(input: RunGdeltSourceJobInput): Promise<SourceJobResult> {
  const startedAt = new Date();

  try {
    const fetchJson = input.fetchJson ?? defaultJsonFetcher;
    const payload = await fetchJson(input.url, { headers: input.headers });
    const events = normalizeGdeltResponse(payload);
    const stats = await ingestGdeltEvents(input.db, events, input.fetchedAt ?? new Date());
    const finishedAt = new Date();

    await insertJobRun(input.db, {
      jobName: 'gdelt',
      jobType: 'source',
      status: 'success',
      startedAt,
      finishedAt,
      recordsProcessed: stats.recordsProcessed,
      metadata: {
        source: 'gdelt',
        url: input.url,
        mappedRegions: stats.mappedRegions,
        insertedSignals: stats.insertedSignals,
      },
    });

    logger.info({ event: 'source.run.end', job_name: 'gdelt', job_type: 'source', source: 'gdelt', status: 'success', duration_ms: finishedAt.getTime() - startedAt.getTime(), records_processed: stats.recordsProcessed });
    return { sourceName: 'gdelt', url: input.url, ...stats };
  } catch (error) {
    const finishedAt = new Date();
    await insertJobRun(input.db, {
      jobName: 'gdelt',
      jobType: 'source',
      status: 'failed',
      startedAt,
      finishedAt,
      errorMessage: error instanceof Error ? error.message : String(error),
      metadata: {
        source: 'gdelt',
        url: input.url,
      },
    });

    logger.error({ event: 'source.run.end', job_name: 'gdelt', job_type: 'source', source: 'gdelt', status: 'failed', duration_ms: finishedAt.getTime() - startedAt.getTime(), message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
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
