import type { QueryableDb } from '../ingestion/types.ts';
import { createLogger } from '../runtime/logger.ts';
import { insertJobRun } from './jobRunLogger.ts';
import { runScoringSnapshotJob } from './scoringSnapshot/runScoringSnapshotJob.ts';
import { runAcledSourceJob } from './sourceRunners/runAcledSourceJob.ts';
import { runEiaSourceJob } from './sourceRunners/runEiaSourceJob.ts';
import { runGdeltSourceJob } from './sourceRunners/runGdeltSourceJob.ts';
import { runImfPortWatchSourceJob } from './sourceRunners/runImfPortWatchSourceJob.ts';
import type { JsonFetcher, SourceJobResult } from './sourceRunners/types.ts';

const logger = createLogger('cycle-runner');

export type CycleStatus = 'success' | 'partial' | 'failed';

export interface SourceEndpointConfig {
  url: string;
  headers?: Record<string, string>;
}

export interface RunWorldWatchCycleInput {
  db: QueryableDb;
  fetchedAt?: Date;
  snapshotTime?: Date;
  fetchJson?: JsonFetcher;
  acled: SourceEndpointConfig;
  gdelt: SourceEndpointConfig;
  imfPortWatch: SourceEndpointConfig;
  eia: SourceEndpointConfig;
}

export interface CycleJobResult {
  jobName: string;
  success: boolean;
  durationMs: number;
  recordsProcessed: number;
  mappedRegions: number;
  insertedSignals: number;
  errorMessage?: string;
}

export interface RunWorldWatchCycleResult {
  status: CycleStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  jobs: CycleJobResult[];
  snapshotTime?: string;
  totalRecordsProcessed: number;
  sourceRecordsProcessed: Record<string, number>;
  snapshotRowsWritten: number;
  alertsGenerated: number;
  regionsScored: number;
}

export async function runWorldWatchCycle(input: RunWorldWatchCycleInput): Promise<RunWorldWatchCycleResult> {
  const startedAt = new Date();
  logger.info({ event: 'cycle.start', job_name: 'worldwatch_cycle', job_type: 'cycle', status: 'started', started_at: startedAt.toISOString() });

  const jobs: CycleJobResult[] = [];
  const sourceResults = await runSourceJobs(input);
  jobs.push(...sourceResults);

  const successfulSources = sourceResults.filter((result) => result.success).length;
  let snapshotTime: string | undefined;
  let snapshotRowsWritten = 0;
  let alertsGenerated = 0;
  let regionsScored = 0;

  if (successfulSources > 0) {
    const snapshotStarted = new Date();
    try {
      const snapshotResult = await runScoringSnapshotJob(input.db, input.snapshotTime ?? new Date());
      snapshotTime = snapshotResult.snapshotTime;
      snapshotRowsWritten = snapshotResult.regionsProcessed;
      alertsGenerated = snapshotResult.alertsInserted;
      regionsScored = snapshotResult.regionsProcessed;
      jobs.push({
        jobName: 'scoring_snapshot',
        success: true,
        durationMs: Date.now() - snapshotStarted.getTime(),
        recordsProcessed: snapshotResult.regionsProcessed,
        mappedRegions: 0,
        insertedSignals: 0,
      });
      logger.info({
        event: 'cycle.snapshot.success',
        job_name: 'scoring_snapshot',
        job_type: 'snapshot',
        status: 'success',
        duration_ms: Date.now() - snapshotStarted.getTime(),
        records_processed: snapshotResult.regionsProcessed,
      });
    } catch (error) {
      jobs.push({
        jobName: 'scoring_snapshot',
        success: false,
        durationMs: Date.now() - snapshotStarted.getTime(),
        recordsProcessed: 0,
        mappedRegions: 0,
        insertedSignals: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      logger.error({
        event: 'cycle.snapshot.failed',
        job_name: 'scoring_snapshot',
        job_type: 'snapshot',
        status: 'failed',
        duration_ms: Date.now() - snapshotStarted.getTime(),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const hasFailures = jobs.some((job) => !job.success);
  const hasSuccess = jobs.some((job) => job.success);
  const status: CycleStatus = hasSuccess ? (hasFailures ? 'partial' : 'success') : 'failed';
  const finishedAt = new Date();
  const sourceRecordsProcessed = Object.fromEntries(sourceResults.map((job) => [job.jobName, job.recordsProcessed]));
  const totalRecordsProcessed = sourceResults.reduce((sum, job) => sum + job.recordsProcessed, 0);

  await insertJobRun(input.db, {
    jobName: 'worldwatch_cycle',
    jobType: 'cycle',
    status,
    startedAt,
    finishedAt,
    recordsProcessed: totalRecordsProcessed,
    errorMessage: status === 'failed' ? 'All source jobs failed. Snapshot was skipped.' : undefined,
    metadata: {
      successfulJobs: jobs.filter((job) => job.success).map((job) => job.jobName),
      failedJobs: jobs.filter((job) => !job.success).map((job) => ({ name: job.jobName, error: job.errorMessage })),
      snapshotTime,
      sourceRecordsProcessed,
      totalRecordsProcessed,
      snapshotRowsWritten,
      alertsGenerated,
      regionsScored,
    },
  });

  logger.info({
    event: 'cycle.end',
    job_name: 'worldwatch_cycle',
    job_type: 'cycle',
    status,
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
    records_processed: totalRecordsProcessed,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
  });

  return {
    status,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    jobs,
    snapshotTime,
    totalRecordsProcessed,
    sourceRecordsProcessed,
    snapshotRowsWritten,
    alertsGenerated,
    regionsScored,
  };
}

async function runSourceJobs(input: RunWorldWatchCycleInput): Promise<CycleJobResult[]> {
  const jobs: Array<{ jobName: string; runner: () => Promise<SourceJobResult> }> = [
    {
      jobName: 'acled',
      runner: () => runAcledSourceJob({ db: input.db, url: input.acled.url, headers: input.acled.headers, fetchedAt: input.fetchedAt, fetchJson: input.fetchJson }),
    },
    {
      jobName: 'gdelt',
      runner: () => runGdeltSourceJob({ db: input.db, url: input.gdelt.url, headers: input.gdelt.headers, fetchedAt: input.fetchedAt, fetchJson: input.fetchJson }),
    },
    {
      jobName: 'imf_portwatch',
      runner: () => runImfPortWatchSourceJob({ db: input.db, url: input.imfPortWatch.url, headers: input.imfPortWatch.headers, fetchedAt: input.fetchedAt, fetchJson: input.fetchJson }),
    },
    {
      jobName: 'eia',
      runner: () => runEiaSourceJob({ db: input.db, url: input.eia.url, headers: input.eia.headers, fetchedAt: input.fetchedAt, fetchJson: input.fetchJson }),
    },
  ];

  const results: CycleJobResult[] = [];

  for (const job of jobs) {
    const startedAt = Date.now();
    try {
      const result = await job.runner();
      results.push({
        jobName: job.jobName,
        success: true,
        durationMs: Date.now() - startedAt,
        recordsProcessed: result.recordsProcessed,
        mappedRegions: result.mappedRegions,
        insertedSignals: result.insertedSignals,
      });
    } catch (error) {
      results.push({
        jobName: job.jobName,
        success: false,
        durationMs: Date.now() - startedAt,
        recordsProcessed: 0,
        mappedRegions: 0,
        insertedSignals: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
