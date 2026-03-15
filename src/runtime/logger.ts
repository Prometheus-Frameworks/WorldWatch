export type LogLevel = 'info' | 'warn' | 'error';

export interface LogFields {
  event?: string;
  message?: string;
  job_name?: string;
  job_type?: string;
  source?: string;
  duration_ms?: number;
  status?: string;
  records_processed?: number;
  [key: string]: unknown;
}

export interface Logger {
  info(fields: LogFields): void;
  warn(fields: LogFields): void;
  error(fields: LogFields): void;
}

export function createLogger(component: string): Logger {
  const log = (level: LogLevel, fields: LogFields): void => {
    const payload = {
      ts: new Date().toISOString(),
      level,
      component,
      ...fields,
    };

    const line = JSON.stringify(payload);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  };

  return {
    info: (fields) => log('info', fields),
    warn: (fields) => log('warn', fields),
    error: (fields) => log('error', fields),
  };
}
