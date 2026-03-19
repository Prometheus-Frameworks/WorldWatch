import type { RunWorldWatchCycleInput, SourceEndpointConfig } from '../jobs/runWorldWatchCycle.ts';
import { getDeploymentPostureConfig, type DeploymentPostureConfig } from '../console/posture.ts';
import type { RuntimeServiceRole } from './service.ts';

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

export interface RuntimeConfigOptions {
  serviceRole?: RuntimeServiceRole;
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env, options: RuntimeConfigOptions = {}): RuntimeConfig {
  const serviceRole = options.serviceRole ?? 'web';

  return {
    port: readInt(env.PORT, 8787),
    databaseUrl: readRequired(env.DATABASE_URL, 'DATABASE_URL', serviceRole),
    cycleIntervalMinutes: readInt(env.CYCLE_INTERVAL_MINUTES, 15),
    deployment: getDeploymentPostureConfig(env),
    sources: {
      acled: buildSourceConfig(env, 'ACLED_URL', serviceRole),
      gdelt: buildSourceConfig(env, 'GDELT_URL', serviceRole),
      imfPortWatch: buildSourceConfig(env, 'IMF_PORTWATCH_URL', serviceRole),
      eia: buildSourceConfig(env, 'EIA_URL', serviceRole),
      unhcr: buildSourceConfig(env, 'UNHCR_URL', serviceRole),
      nasaFirms: buildSourceConfig(env, 'NASA_FIRMS_URL', serviceRole),
    },
  };
}

export function loadCycleInputFromEnv(env: NodeJS.ProcessEnv, db: RunWorldWatchCycleInput['db']): RunWorldWatchCycleInput {
  const config = loadRuntimeConfig(env, { serviceRole: 'scheduler' });
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

function buildSourceConfig(env: NodeJS.ProcessEnv, urlEnvName: string, serviceRole: RuntimeServiceRole): SourceEndpointConfig {
  return {
    url: readRequired(env[urlEnvName], urlEnvName, serviceRole),
  };
}

function readRequired(value: string | undefined, key: string, serviceRole: RuntimeServiceRole): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}. WorldWatch ${serviceRole} service cannot start without it.`);
  }
  return value;
}

function readInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
