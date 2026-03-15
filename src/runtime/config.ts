import type { RunWorldWatchCycleInput, SourceEndpointConfig } from '../jobs/runWorldWatchCycle.ts';
import { getDeploymentPostureConfig, type DeploymentPostureConfig } from '../console/posture.ts';

export interface RuntimeConfig {
  port: number;
  databaseUrl: string;
  cycleIntervalMinutes: number;
  deployment: DeploymentPostureConfig;
  sources: {
    acled: SourceEndpointConfig;
    gdelt: SourceEndpointConfig;
    imfPortWatch: SourceEndpointConfig;
    eia: SourceEndpointConfig;
    unhcr: SourceEndpointConfig;
    nasaFirms: SourceEndpointConfig;
  };
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    port: readInt(env.PORT, 8787),
    databaseUrl: readRequired(env.DATABASE_URL, 'DATABASE_URL'),
    cycleIntervalMinutes: readInt(env.CYCLE_INTERVAL_MINUTES, 15),
    deployment: getDeploymentPostureConfig(env),
    sources: {
      acled: buildSourceConfig(env, 'ACLED_URL'),
      gdelt: buildSourceConfig(env, 'GDELT_URL'),
      imfPortWatch: buildSourceConfig(env, 'IMF_PORTWATCH_URL'),
      eia: buildSourceConfig(env, 'EIA_URL'),
      unhcr: buildSourceConfig(env, 'UNHCR_URL'),
      nasaFirms: buildSourceConfig(env, 'NASA_FIRMS_URL'),
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
    unhcr: config.sources.unhcr,
    nasaFirms: config.sources.nasaFirms,
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
