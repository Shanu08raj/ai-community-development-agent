import app from './app.js';
import connectDB, { disconnectDB } from './config/db.js';
import { env, validateEnv } from './config/env.js';
import { logger } from './utils/logger.js';

let server;

async function startServer() {
  validateEnv();
  await connectDB({ exitOnError: true });

  server = app.listen(env.PORT, () => {
    logger.info('JanSetu AI Backend running', {
      port: env.PORT,
      environment: env.NODE_ENV,
    });
  });
}

async function shutdown(signal) {
  logger.info('Graceful shutdown initiated', { signal });
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch((err) => {
  console.error('Server startup failed:', err.message);
  process.exit(1);
});
