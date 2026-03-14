import type { RunWorldWatchCycleInput, SourceEndpointConfig } from '../jobs/runWorldWatchCycle.ts';

export interface RuntimeConfig {
  port: number;
  databaseUrl: string;
  sources: {
    acled: SourceEndpointConfig;
    gdelt: SourceEndpointConfig;
    imfPortWatch: SourceEndpointConfig;
    eia: SourceEndpointConfig;
  };
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    port: readInt(env.PORT, 8787),
    databaseUrl: readRequired(env.DATABASE_URL, 'DATABASE_URL'),
    sources: {
      acled: buildSourceConfig(env, 'ACLED_URL'),
      gdelt: buildSourceConfig(env, 'GDELT_URL'),
      imfPortWatch: buildSourceConfig(env, 'IMF_PORTWATCH_URL'),
      eia: buildSourceConfig(env, 'EIA_URL'),
    },
  };
}

export function loadCycleInputFromEnv(env: NodeJS.ProcessEnv, db: RunWorldWatchCycleInput['db']): RunWorldWatchCycleInput {
  const config = loadRuntimeConfig(env);
  return {
    db,
    acled: config.sources.acled,
    gdelt: config.sources.gdelt,
    imfPortWatch: config.sources.imfPortWatch,
    eia: config.sources.eia,
  };
}

function buildSourceConfig(env: NodeJS.ProcessEnv, urlEnvName: string): SourceEndpointConfig {
  return {
    url: readRequired(env[urlEnvName], urlEnvName),
  };
}

function readRequired(value: string | undefined, key: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function readInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
