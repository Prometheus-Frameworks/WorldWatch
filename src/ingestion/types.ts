import type { NormalizedSignalType } from '../shared/signals/types.ts';

export interface QueryableDb {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export interface PersistableSignal {
  regionId: number;
  sourceId: number;
  signalType: NormalizedSignalType;
  value: number;
  unit: string;
  eventTime: Date;
  metadataJson?: Record<string, unknown>;
}

export interface RegionMappingInput {
  latitude?: number;
  longitude?: number;
  regionHint?: string;
  chokepointHint?: string;
}
