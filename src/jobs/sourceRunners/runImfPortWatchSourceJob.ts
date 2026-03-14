import {
  ingestImfPortWatchObservations,
  type ImfPortWatchObservation,
} from '../../ingestion/adapters/imfPortWatchAdapter.ts';
import { defaultJsonFetcher, type SourceRunnerContext } from './types.ts';

interface ImfPortWatchApiResponse {
  data?: unknown[];
  observations?: unknown[];
}

export interface RunImfPortWatchSourceJobInput extends SourceRunnerContext {
  url: string;
  headers?: Record<string, string>;
}

export async function runImfPortWatchSourceJob(
  input: RunImfPortWatchSourceJobInput,
): Promise<void> {
  const fetchJson = input.fetchJson ?? defaultJsonFetcher;
  const payload = await fetchJson(input.url, { headers: input.headers });
  const observations = normalizeImfPortWatchResponse(payload);
  await ingestImfPortWatchObservations(input.db, observations, input.fetchedAt ?? new Date());
}

function normalizeImfPortWatchResponse(payload: unknown): ImfPortWatchObservation[] {
  const response = payload as ImfPortWatchApiResponse | unknown[];
  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response.observations)
      ? response.observations
      : Array.isArray(response.data)
        ? response.data
        : [];

  return rows
    .map((row) => row as Partial<ImfPortWatchObservation>)
    .filter(
      (row): row is Partial<ImfPortWatchObservation> & Pick<ImfPortWatchObservation, 'observation_id' | 'observed_at'> =>
        typeof row.observation_id === 'string' && typeof row.observed_at === 'string',
    )
    .map((row) => ({
      observation_id: row.observation_id,
      observed_at: row.observed_at,
      chokepoint: asString(row.chokepoint),
      port_name: asString(row.port_name),
      latitude: asNumber(row.latitude),
      longitude: asNumber(row.longitude),
      congestion_index: asNumber(row.congestion_index),
      transit_delay_hours: asNumber(row.transit_delay_hours),
      transit_count: asNumber(row.transit_count),
    }));
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
