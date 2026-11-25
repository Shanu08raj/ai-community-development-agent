import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { createApiRouter } from './routes/index.js';

export function createApp(options = {}) {
  const app = express();

  const allowedOrigins = new Set(
    [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean)
  );

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin) || env.IS_TEST) {
          callback(null, true);
        } else {
          callback(new Error('Origin not permitted by CORS policy.'));
        }
      },
      credentials: true,
    })
  );

  if (!env.IS_TEST) {
    app.use(morgan('short'));
  }

  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1', createApiRouter(options));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
