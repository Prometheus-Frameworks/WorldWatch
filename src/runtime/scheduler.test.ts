import assert from 'node:assert/strict';
import test from 'node:test';

import { createCycleScheduler } from './scheduler.ts';

function createTestLogger() {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

test('scheduler prevents overlapping runs', async () => {
  const ticks: Array<() => void> = [];
  let runCount = 0;
  let releaseRun: () => void = () => {};

  const scheduler = createCycleScheduler({
    intervalMinutes: 1,
    logger: createTestLogger(),
    setIntervalFn: ((fn: () => void) => {
      ticks.push(fn);
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval,
    clearIntervalFn: (() => {}) as typeof clearInterval,
    runCycle: async () => {
      runCount += 1;
      await new Promise<void>((resolve) => {
        releaseRun = resolve;
      });
      return {
        status: 'success',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 1,
        jobs: [],
        totalRecordsProcessed: 0,
        sourceRecordsProcessed: {},
        snapshotRowsWritten: 0,
        alertsGenerated: 0,
        regionsScored: 0,
      };
    },
  });

  const startPromise = scheduler.start();
  await Promise.resolve();
  assert.equal(runCount, 1);

  ticks[0]();
  await Promise.resolve();
  assert.equal(runCount, 1);

  releaseRun();
  await startPromise;

  ticks[0]();
  await Promise.resolve();
  assert.equal(runCount, 2);
});

test('scheduler handles cycle failure and continues running', async () => {
  const ticks: Array<() => void> = [];
  let runCount = 0;

  const scheduler = createCycleScheduler({
    intervalMinutes: 1,
    logger: createTestLogger(),
    setIntervalFn: ((fn: () => void) => {
      ticks.push(fn);
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval,
    clearIntervalFn: (() => {}) as typeof clearInterval,
    runCycle: async () => {
      runCount += 1;
      if (runCount === 1) {
        throw new Error('first cycle failed');
      }
      return {
        status: 'partial',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 1,
        jobs: [],
        totalRecordsProcessed: 0,
        sourceRecordsProcessed: {},
        snapshotRowsWritten: 0,
        alertsGenerated: 0,
        regionsScored: 0,
      };
    },
  });

  await scheduler.start();
  assert.equal(runCount, 1);

  ticks[0]();
  await new Promise<void>((resolve) => setImmediate(() => resolve()));
  assert.equal(runCount, 2);
});
