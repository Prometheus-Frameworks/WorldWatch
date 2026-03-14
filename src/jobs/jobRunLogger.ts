import type { QueryableDb } from '../ingestion/types.ts';

export type JobRunType = 'source' | 'snapshot' | 'cycle';
export type JobRunStatus = 'success' | 'partial' | 'failed';

export interface JobRunInput {
  jobName: string;
  jobType: JobRunType;
  status: JobRunStatus;
  startedAt: Date;
  finishedAt: Date;
  recordsProcessed?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface JobRunRow {
  id: number;
}

export async function insertJobRun(db: QueryableDb, input: JobRunInput): Promise<number> {
  const durationMs = Math.max(0, input.finishedAt.getTime() - input.startedAt.getTime());

  const result = await db.query<JobRunRow>(
    `INSERT INTO job_runs (
       job_name, job_type, status, started_at, finished_at,
       duration_ms, records_processed, error_message, metadata_json
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     RETURNING id`,
    [
      input.jobName,
      input.jobType,
      input.status,
      input.startedAt.toISOString(),
      input.finishedAt.toISOString(),
      durationMs,
      input.recordsProcessed ?? 0,
      input.errorMessage ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  return result.rows[0]?.id ?? 0;
}
