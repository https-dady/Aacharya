import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import cookieParser from 'cookie-parser';

import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';

import { apiRateLimiter } from './middleware/rate-limit.middleware.js';

import {
  errorHandler,
  notFoundHandler,
} from './middleware/error.middleware.js';

const app = express();

app.disable('x-powered-by');

app.use(helmet());

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

app.use(express.json({ limit: '1mb' }));

app.use(cookieParser());

app.use(
  pinoHttp({
    level: env.logLevel,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.otp',
        'req.body.token',
      ],
      censor: '[REDACTED]',
    },
  }),
);

// Health endpoints remain available for operational monitoring.
app.use('/health', healthRoutes);

// Apply API-wide rate limiting.
app.use('/api/v1', apiRateLimiter);

app.get('/api/v1/meta', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'Aacharya LMS API',
      version: '1.0.0',
      environment: env.nodeEnv,
    },
  });
});

// Authentication routes: login and refresh.
app.use('/api/v1/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;