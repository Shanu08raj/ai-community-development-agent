import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import connectDB, { disconnectDB } from './config/db.js';
import { env, validateEnv } from './config/env.js';
import { runStartupAdminProvisioning } from './scripts/provisionProductionAdmin.js';
import { logger } from './utils/logger.js';

let server;

export async function startServer() {
  validateEnv();
  await connectDB({ exitOnError: true });
  await runStartupAdminProvisioning();

  server = app.listen(env.PORT, () => {
    logger.info('JanSetu AI Backend running', {
      port: env.PORT,
      environment: env.NODE_ENV,
    });
  });

  return server;
}

async function shutdown(signal) {
  logger.info('Graceful shutdown initiated', { signal });
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDB();
  process.exit(0);
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  startServer().catch((err) => {
    console.error('Server startup failed:', err.message);
    process.exit(1);
  });
}
