import type { Logger } from './logger.ts';
import type { RuntimeConfig } from './config.ts';

export type RuntimeServiceRole = 'web' | 'scheduler' | 'cycle' | 'migrate' | 'seed';

export interface ServiceStartupSummary {
  serviceRole: RuntimeServiceRole;
  deploymentPosture: RuntimeConfig['deployment']['posture'];
  port?: number;
  cycleIntervalMinutes?: number;
  hasDatabaseUrl: boolean;
  configuredSourceCount: number;
}

export function buildServiceStartupSummary(serviceRole: RuntimeServiceRole, config: RuntimeConfig): ServiceStartupSummary {
  const configuredSourceCount = Object.values(config.sources).filter((source) => source.url.trim().length > 0).length;

  return {
    serviceRole,
    deploymentPosture: config.deployment.posture,
    port: serviceRole === 'web' ? config.port : undefined,
    cycleIntervalMinutes: serviceRole === 'scheduler' ? config.cycleIntervalMinutes : undefined,
    hasDatabaseUrl: config.databaseUrl.trim().length > 0,
    configuredSourceCount,
  };
}

export function logServiceStartupSummary(logger: Logger, serviceRole: RuntimeServiceRole, config: RuntimeConfig): void {
  const summary = buildServiceStartupSummary(serviceRole, config);

  logger.info({
    event: 'service.startup.config',
    message: `Loaded WorldWatch ${serviceRole} runtime configuration.`,
    service_role: summary.serviceRole,
    deployment_posture: summary.deploymentPosture,
    port: summary.port,
    cycle_interval_minutes: summary.cycleIntervalMinutes,
    database_configured: summary.hasDatabaseUrl,
    configured_source_count: summary.configuredSourceCount,
  });
}
