import {
  ingestUnhcrDisplacementRecords,
  type UnhcrDisplacementRecord,
} from '../../ingestion/adapters/unhcrAdapter.ts';
import { createLogger } from '../../runtime/logger.ts';
import { insertJobRun } from '../jobRunLogger.ts';
import { defaultJsonFetcher, type SourceJobResult, type SourceRunnerContext } from './types.ts';

const logger = createLogger('source-runner');

interface UnhcrApiResponse {
  data?: unknown[];
  records?: unknown[];
}

export interface RunUnhcrSourceJobInput extends SourceRunnerContext {
  url: string;
  headers?: Record<string, string>;
}

export async function runUnhcrSourceJob(input: RunUnhcrSourceJobInput): Promise<SourceJobResult> {
  const startedAt = new Date();

  try {
    const fetchJson = input.fetchJson ?? defaultJsonFetcher;
    const payload = await fetchJson(input.url, { headers: input.headers });
    const records = normalizeUnhcrResponse(payload);
    const stats = await ingestUnhcrDisplacementRecords(input.db, records, input.fetchedAt ?? new Date());
    const finishedAt = new Date();

    await insertJobRun(input.db, {
      jobName: 'unhcr',
      jobType: 'source',
      status: 'success',
      startedAt,
      finishedAt,
      recordsProcessed: stats.recordsProcessed,
      metadata: {
        source: 'unhcr',
        url: input.url,
        mappedRegions: stats.mappedRegions,
        insertedSignals: stats.insertedSignals,
      },
    });

    logger.info({ event: 'source.run.end', job_name: 'unhcr', job_type: 'source', source: 'unhcr', status: 'success', duration_ms: finishedAt.getTime() - startedAt.getTime(), records_processed: stats.recordsProcessed });
    return { sourceName: 'unhcr', url: input.url, ...stats };
  } catch (error) {
    const finishedAt = new Date();
    await insertJobRun(input.db, {
      jobName: 'unhcr',
      jobType: 'source',
      status: 'failed',
      startedAt,
      finishedAt,
      errorMessage: error instanceof Error ? error.message : String(error),
      metadata: {
        source: 'unhcr',
        url: input.url,
      },
    });

    logger.error({ event: 'source.run.end', job_name: 'unhcr', job_type: 'source', source: 'unhcr', status: 'failed', duration_ms: finishedAt.getTime() - startedAt.getTime(), message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

function normalizeUnhcrResponse(payload: unknown): UnhcrDisplacementRecord[] {
  const response = payload as UnhcrApiResponse | unknown[];
  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response.records)
      ? response.records
      : Array.isArray(response.data)
        ? response.data
        : [];

  return rows
    .map((row) => row as Record<string, unknown>)
    .map((row) => {
      const observedAt = asString(row.observed_at) ?? asString(row.report_date);
      const country = asString(row.country) ?? asString(row.country_name);
      const delta = asNumber(row.displacement_delta) ?? asNumber(row.new_displacements);
      const recordId = asString(row.record_id) ?? asString(row.id) ?? `${country ?? 'unknown'}:${observedAt ?? 'unknown'}`;

      return {
        record_id: recordId,
        observed_at: observedAt ?? '',
        country,
        admin1: asString(row.admin1),
        latitude: asNumber(row.latitude),
        longitude: asNumber(row.longitude),
        displaced_total: asNumber(row.displaced_total) ?? asNumber(row.total_displaced),
        displacement_delta: delta,
        displacement_acceleration: asNumber(row.displacement_acceleration),
      };
    })
    .filter((row) => row.observed_at.length > 0);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
