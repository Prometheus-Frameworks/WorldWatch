import type { Logger } from './logger.ts';

export interface CycleRunnerResult {
  status: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  jobs: Array<{ jobName: string; success: boolean }>;
}

export interface SchedulerDependencies {
  intervalMinutes: number;
  runCycle: () => Promise<CycleRunnerResult>;
  logger: Logger;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
}

export interface SchedulerController {
  start: () => Promise<void>;
  shutdown: () => Promise<void>;
  isRunning: () => boolean;
}

export function createCycleScheduler(dependencies: SchedulerDependencies): SchedulerController {
  const setIntervalFn = dependencies.setIntervalFn ?? setInterval;
  const clearIntervalFn = dependencies.clearIntervalFn ?? clearInterval;

  let timer: ReturnType<typeof setInterval> | null = null;
  let inFlight: Promise<void> | null = null;
  let stopping = false;

  const runOnce = async (): Promise<void> => {
    if (inFlight) {
      dependencies.logger.warn({ event: 'scheduler.cycle.skip_overlap', message: 'Skipping scheduled cycle because previous run is still in progress.' });
      return;
    }

    const startedAtMs = Date.now();
    dependencies.logger.info({ event: 'scheduler.cycle.start', job_name: 'worldwatch_cycle', job_type: 'cycle', status: 'started' });

    inFlight = (async () => {
      try {
        const result = await dependencies.runCycle();
        dependencies.logger.info({
          event: 'scheduler.cycle.end',
          job_name: 'worldwatch_cycle',
          job_type: 'cycle',
          status: result.status,
          duration_ms: result.durationMs,
          records_processed: result.jobs.length,
          started_at: result.startedAt,
          finished_at: result.finishedAt,
        });
      } catch (error) {
        dependencies.logger.error({
          event: 'scheduler.cycle.error',
          job_name: 'worldwatch_cycle',
          job_type: 'cycle',
          status: 'failed',
          duration_ms: Date.now() - startedAtMs,
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        inFlight = null;
      }
    })();

    await inFlight;
  };

  return {
    start: async () => {
      const intervalMs = Math.max(1, dependencies.intervalMinutes) * 60 * 1000;
      dependencies.logger.info({ event: 'scheduler.start', message: 'Starting WorldWatch scheduler.', interval_minutes: dependencies.intervalMinutes });
      timer = setIntervalFn(() => {
        if (!stopping) {
          void runOnce();
        }
      }, intervalMs);
      await runOnce();
    },
    shutdown: async () => {
      stopping = true;
      dependencies.logger.info({ event: 'scheduler.shutdown.start', message: 'Shutting down scheduler.' });

      if (timer) {
        clearIntervalFn(timer);
        timer = null;
      }

      if (inFlight) {
        await inFlight;
      }

      dependencies.logger.info({ event: 'scheduler.shutdown.end', message: 'Scheduler shut down cleanly.' });
    },
    isRunning: () => Boolean(inFlight),
  };
}
