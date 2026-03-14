import type { QueryableDb } from '../ingestion/types.ts';
import { insertJobRun } from './jobRunLogger.ts';
import { runScoringSnapshotJob } from './scoringSnapshot/runScoringSnapshotJob.ts';
import { runAcledSourceJob } from './sourceRunners/runAcledSourceJob.ts';
import { runEiaSourceJob } from './sourceRunners/runEiaSourceJob.ts';
import { runGdeltSourceJob } from './sourceRunners/runGdeltSourceJob.ts';
import { runImfPortWatchSourceJob } from './sourceRunners/runImfPortWatchSourceJob.ts';
import type { JsonFetcher, SourceJobResult } from './sourceRunners/types.ts';

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
}

export async function runWorldWatchCycle(input: RunWorldWatchCycleInput): Promise<RunWorldWatchCycleResult> {
  const startedAt = new Date();
  const jobs: CycleJobResult[] = [];
  const sourceResults = await runSourceJobs(input);
  jobs.push(...sourceResults);

  const successfulSources = sourceResults.filter((result) => result.success).length;
  let snapshotTime: string | undefined;

  if (successfulSources > 0) {
    const snapshotStarted = new Date();
    try {
      const snapshotResult = await runScoringSnapshotJob(input.db, input.snapshotTime ?? new Date());
      snapshotTime = snapshotResult.snapshotTime;
      jobs.push({
        jobName: 'scoring_snapshot',
        success: true,
        durationMs: Date.now() - snapshotStarted.getTime(),
        recordsProcessed: snapshotResult.regionsProcessed,
        mappedRegions: 0,
        insertedSignals: 0,
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
    }
  }

  const hasFailures = jobs.some((job) => !job.success);
  const hasSuccess = jobs.some((job) => job.success);
  const status: CycleStatus = hasSuccess ? (hasFailures ? 'partial' : 'success') : 'failed';
  const finishedAt = new Date();

  await insertJobRun(input.db, {
    jobName: 'worldwatch_cycle',
    jobType: 'cycle',
    status,
    startedAt,
    finishedAt,
    recordsProcessed: jobs.reduce((sum, job) => sum + job.recordsProcessed, 0),
    errorMessage: status === 'failed' ? 'All source jobs failed. Snapshot was skipped.' : undefined,
    metadata: {
      successfulJobs: jobs.filter((job) => job.success).map((job) => job.jobName),
      failedJobs: jobs.filter((job) => !job.success).map((job) => ({ name: job.jobName, error: job.errorMessage })),
      snapshotTime,
    },
  });

  return {
    status,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    jobs,
    snapshotTime,
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
