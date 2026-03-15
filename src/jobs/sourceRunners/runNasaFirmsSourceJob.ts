import {
  ingestNasaFirmsThermalRecords,
  type NasaFirmsThermalRecord,
} from '../../ingestion/adapters/nasaFirmsAdapter.ts';
import { createLogger } from '../../runtime/logger.ts';
import { insertJobRun } from '../jobRunLogger.ts';
import { defaultJsonFetcher, type SourceJobResult, type SourceRunnerContext } from './types.ts';

const logger = createLogger('source-runner');

interface NasaFirmsApiResponse {
  data?: unknown[];
  fires?: unknown[];
}

export interface RunNasaFirmsSourceJobInput extends SourceRunnerContext {
  url: string;
  headers?: Record<string, string>;
}

export async function runNasaFirmsSourceJob(
  input: RunNasaFirmsSourceJobInput,
): Promise<SourceJobResult> {
  const startedAt = new Date();

  try {
    const fetchJson = input.fetchJson ?? defaultJsonFetcher;
    const payload = await fetchJson(input.url, { headers: input.headers });
    const records = normalizeNasaFirmsResponse(payload);
    const stats = await ingestNasaFirmsThermalRecords(input.db, records, input.fetchedAt ?? new Date());
    const finishedAt = new Date();

    await insertJobRun(input.db, {
      jobName: 'nasa_firms',
      jobType: 'source',
      status: 'success',
      startedAt,
      finishedAt,
      recordsProcessed: stats.recordsProcessed,
      metadata: {
        source: 'nasa_firms',
        url: input.url,
        mappedRegions: stats.mappedRegions,
        insertedSignals: stats.insertedSignals,
      },
    });

    logger.info({ event: 'source.run.end', job_name: 'nasa_firms', job_type: 'source', source: 'nasa_firms', status: 'success', duration_ms: finishedAt.getTime() - startedAt.getTime(), records_processed: stats.recordsProcessed });
    return { sourceName: 'nasa_firms', url: input.url, ...stats };
  } catch (error) {
    const finishedAt = new Date();
    await insertJobRun(input.db, {
      jobName: 'nasa_firms',
      jobType: 'source',
      status: 'failed',
      startedAt,
      finishedAt,
      errorMessage: error instanceof Error ? error.message : String(error),
      metadata: {
        source: 'nasa_firms',
        url: input.url,
      },
    });

    logger.error({ event: 'source.run.end', job_name: 'nasa_firms', job_type: 'source', source: 'nasa_firms', status: 'failed', duration_ms: finishedAt.getTime() - startedAt.getTime(), message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

function normalizeNasaFirmsResponse(payload: unknown): NasaFirmsThermalRecord[] {
  const response = payload as NasaFirmsApiResponse | unknown[];
  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response.fires)
      ? response.fires
      : Array.isArray(response.data)
        ? response.data
        : [];

  return rows
    .map((row) => row as Record<string, unknown>)
    .map((row, index) => {
      const observedAt = parseObservedAt(row.acq_date, row.acq_time, row.observed_at);
      const latitude = asNumber(row.latitude) ?? asNumber(row.lat);
      const longitude = asNumber(row.longitude) ?? asNumber(row.lng) ?? asNumber(row.lon);
      const eventId =
        asString(row.event_id) ??
        asString(row.id) ??
        `${observedAt ?? 'unknown'}:${latitude ?? 'na'}:${longitude ?? 'na'}:${index}`;

      return {
        event_id: eventId,
        observed_at: observedAt ?? '',
        latitude,
        longitude,
        region: asString(row.region) ?? asString(row.country),
        satellite: asString(row.satellite),
        confidence: asNumber(row.confidence),
        brightness: asNumber(row.brightness) ?? asNumber(row.bright_ti4),
        frp: asNumber(row.frp),
      };
    })
    .filter((row) => row.observed_at.length > 0);
}

function parseObservedAt(acqDate: unknown, acqTime: unknown, observedAt: unknown): string | undefined {
  const provided = asString(observedAt);
  if (provided) return provided;

  const date = asString(acqDate);
  if (!date) return undefined;

  const time = asString(acqTime)?.padStart(4, '0') ?? '0000';
  return `${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00Z`;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
