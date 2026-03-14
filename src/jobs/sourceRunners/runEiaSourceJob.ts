import { ingestEiaReadings, type EiaReading } from '../../ingestion/adapters/eiaAdapter.ts';
import { insertJobRun } from '../jobRunLogger.ts';
import { defaultJsonFetcher, type SourceJobResult, type SourceRunnerContext } from './types.ts';

interface EiaApiResponse {
  response?: {
    data?: unknown[];
  };
  data?: unknown[];
}

export interface RunEiaSourceJobInput extends SourceRunnerContext {
  url: string;
  headers?: Record<string, string>;
}

export async function runEiaSourceJob(input: RunEiaSourceJobInput): Promise<SourceJobResult> {
  const startedAt = new Date();

  try {
    const fetchJson = input.fetchJson ?? defaultJsonFetcher;
    const payload = await fetchJson(input.url, { headers: input.headers });
    const readings = normalizeEiaResponse(payload);
    const stats = await ingestEiaReadings(input.db, readings, input.fetchedAt ?? new Date());

    await insertJobRun(input.db, {
      jobName: 'eia',
      jobType: 'source',
      status: 'success',
      startedAt,
      finishedAt: new Date(),
      recordsProcessed: stats.recordsProcessed,
      metadata: {
        source: 'eia',
        url: input.url,
        mappedRegions: stats.mappedRegions,
        insertedSignals: stats.insertedSignals,
      },
    });

    return { sourceName: 'eia', url: input.url, ...stats };
  } catch (error) {
    await insertJobRun(input.db, {
      jobName: 'eia',
      jobType: 'source',
      status: 'failed',
      startedAt,
      finishedAt: new Date(),
      errorMessage: error instanceof Error ? error.message : String(error),
      metadata: {
        source: 'eia',
        url: input.url,
      },
    });

    throw error;
  }
}

function normalizeEiaResponse(payload: unknown): EiaReading[] {
  const response = payload as EiaApiResponse | unknown[];
  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response.response?.data)
      ? response.response.data
      : Array.isArray(response.data)
        ? response.data
        : [];

  return rows
    .map((row) => row as Partial<EiaReading>)
    .filter(
      (row): row is Partial<EiaReading> & Pick<EiaReading, 'series_id' | 'period'> =>
        typeof row.series_id === 'string' && typeof row.period === 'string',
    )
    .map((row) => ({
      series_id: row.series_id,
      period: row.period,
      value: asRequiredNumber(row.value),
      region: asString(row.region),
      latitude: asNumber(row.latitude),
      longitude: asNumber(row.longitude),
      rolling_stddev: asNumber(row.rolling_stddev),
    }))
    .filter((row) => Number.isFinite(row.value));
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asRequiredNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN;
}
