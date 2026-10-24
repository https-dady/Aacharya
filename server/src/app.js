import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import cookieParser from 'cookie-parser';

import { env } from './config/env.js';

import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import departmentRoutes from './routes/department.routes.js';
import hodRoutes from './routes/hod.routes.js';

import facultyRoutes from './routes/faculty.routes.js';
import batchRoutes from './routes/batch.routes.js';
import sectionRoutes from './routes/section.routes.js';
import mentorRoutes from './routes/mentor.routes.js';
import studentRoutes from './routes/student.routes.js';
import studentImportRoutes from './routes/student-import.routes.js';

import {
  studentUploadErrorMiddleware,
} from './middleware/student-upload-error.middleware.js';

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

// Health endpoints
app.use('/health', healthRoutes);

// API-wide rate limiting
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

// Authentication
app.use('/api/v1/auth', authRoutes);

// Department management
app.use('/api/v1/departments', departmentRoutes);

// Account provisioning: HOD creation
app.use('/api/v1/provisioning', hodRoutes);

// Faculty account provisioning
app.use('/api/v1/provisioning/faculty', facultyRoutes);

// Batch management
app.use('/api/v1/provisioning/batches', batchRoutes);

// Section management
app.use('/api/v1/provisioning', sectionRoutes);

// Mentor role and batch/section assignments
app.use('/api/v1/provisioning', mentorRoutes);

// Student account provisioning
app.use('/api/v1/provisioning', studentRoutes);

// Import bulk student CSV
app.use('/api/v1/provisioning', studentImportRoutes);


// Error handling

app.use(notFoundHandler);

app.use(studentUploadErrorMiddleware);

app.use(errorHandler);

export default app;