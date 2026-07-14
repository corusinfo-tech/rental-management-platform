import assert from 'node:assert/strict';
import test from 'node:test';
import { loadWorkerRuntimeConfig } from '../dist/runtime-config.js';
import { WorkerRuntime } from '../dist/runtime.js';

const valid = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/noagent4u_test',
  REDIS_URL: 'redis://localhost:6379/15',
};

test('worker runtime configuration supplies safe polling defaults', () => {
  const config = loadWorkerRuntimeConfig(valid);
  assert.equal(config.healthPort, 3011);
  assert.equal(config.pollIntervalMs, 1000);
  assert.equal(config.batchSize, 20);
});

test('worker runtime rejects missing database configuration', () => {
  assert.throws(() => loadWorkerRuntimeConfig({ REDIS_URL: valid.REDIS_URL }));
});

test('worker runtime rejects unsupported Redis URLs', () => {
  assert.throws(() => loadWorkerRuntimeConfig({ ...valid, REDIS_URL: 'http://localhost:6379' }));
});

function dependencies({ databaseFailure = false, redisFailure = false } = {}) {
  const state = { disconnected: false, quit: false, polled: 0 };
  return {
    state,
    value: {
      prisma: {
        $connect: async () => { if (databaseFailure) throw new Error('database unavailable'); },
        $queryRaw: async () => [{ value: 1 }],
        $disconnect: async () => { state.disconnected = true; },
        outboxEvent: { count: async () => 0, findFirst: async () => null },
      },
      redis: {
        status: 'ready',
        connect: async () => {},
        ping: async () => { if (redisFailure) throw new Error('redis unavailable'); return 'PONG'; },
        quit: async () => { state.quit = true; },
      },
      outbox: {
        workerId: 'test-worker',
        metrics: { processed: 0, failed: 0, retries: 0, deadLetters: 0, totalLatencyMs: 0, totalProcessingMs: 0 },
        pollOnce: async () => { state.polled += 1; return 0; },
      },
    },
  };
}

test('worker starts, exposes liveness/readiness, and stops gracefully', async () => {
  const fixture = dependencies();
  const runtime = new WorkerRuntime({ ...loadWorkerRuntimeConfig(valid), healthPort: 0 }, fixture.value);
  await runtime.start();
  const port = runtime.healthPort();
  assert.ok(port);
  assert.equal((await fetch(`http://127.0.0.1:${port}/health/live`)).status, 200);
  assert.equal((await fetch(`http://127.0.0.1:${port}/health/ready`)).status, 200);
  await runtime.stop();
  assert.equal(fixture.state.disconnected, true);
  assert.equal(fixture.state.quit, true);
});

test('worker startup fails when PostgreSQL is unavailable', async () => {
  const fixture = dependencies({ databaseFailure: true });
  const runtime = new WorkerRuntime({ ...loadWorkerRuntimeConfig(valid), healthPort: 0 }, fixture.value);
  await assert.rejects(() => runtime.start(), /PostgreSQL startup probe failed/);
  await runtime.stop();
});

test('worker startup fails when Redis is unavailable', async () => {
  const fixture = dependencies({ redisFailure: true });
  const runtime = new WorkerRuntime({ ...loadWorkerRuntimeConfig(valid), healthPort: 0 }, fixture.value);
  await assert.rejects(() => runtime.start(), /Redis startup probe failed/);
  await runtime.stop();
});
