import { WorkerRuntime } from './runtime';
import { loadWorkerRuntimeConfig } from './runtime-config';

async function main(): Promise<void> {
  const runtime = new WorkerRuntime(loadWorkerRuntimeConfig());
  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    process.stdout.write(`Worker received ${signal}; shutting down.\n`);
    await runtime.stop();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  await runtime.start();
  process.stdout.write('Worker started.\n');
}

main().catch((error) => {
  process.stderr.write(`Worker startup failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
