export type WorkerRuntimeConfig = {
  databaseUrl: string;
  redisUrl: string;
  host: string;
  healthPort: number;
  pollIntervalMs: number;
  leaseTimeoutMs: number;
  maximumAttempts: number;
  retryBaseDelayMs: number;
  batchSize: number;
};

function required(environment: NodeJS.ProcessEnv, key: string): string {
  const value = environment[key]?.trim();
  if (!value) throw new Error(`Missing required worker environment variable: ${key}`);
  return value;
}

function positiveInteger(environment: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const value = Number(environment[key] ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${key} must be a positive integer`);
  return value;
}

function connectionUrl(environment: NodeJS.ProcessEnv, key: string, protocols: readonly string[]): string {
  const value = required(environment, key);
  try {
    if (!protocols.includes(new URL(value).protocol)) throw new Error('unsupported protocol');
  } catch {
    throw new Error(`${key} must be a valid ${protocols.join(' or ')} URL`);
  }
  return value;
}

export function loadWorkerRuntimeConfig(environment: NodeJS.ProcessEnv = process.env): WorkerRuntimeConfig {
  return {
    databaseUrl: connectionUrl(environment, 'DATABASE_URL', ['postgresql:', 'postgres:']),
    redisUrl: connectionUrl(environment, 'REDIS_URL', ['redis:', 'rediss:']),
    host: environment.WORKER_HEALTH_HOST?.trim() || '0.0.0.0',
    healthPort: positiveInteger(environment, 'WORKER_HEALTH_PORT', 3011),
    pollIntervalMs: positiveInteger(environment, 'OUTBOX_POLL_INTERVAL_MS', 1_000),
    leaseTimeoutMs: positiveInteger(environment, 'OUTBOX_LEASE_TIMEOUT_MS', 30_000),
    maximumAttempts: positiveInteger(environment, 'OUTBOX_MAX_ATTEMPTS', 8),
    retryBaseDelayMs: positiveInteger(environment, 'OUTBOX_RETRY_BASE_DELAY_MS', 1_000),
    batchSize: positiveInteger(environment, 'OUTBOX_BATCH_SIZE', 20),
  };
}
