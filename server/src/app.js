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
import notificationRoutes from './routes/notification.routes.js';

import {
  studentUploadErrorMiddleware,
} from './middleware/student-upload-error.middleware.js';

import {
  apiRateLimiter,
} from './middleware/rate-limit.middleware.js';

import {
  errorHandler,
  notFoundHandler,
} from './middleware/error.middleware.js';

const app = express();

app.disable('x-powered-by');

// 1. Security headers.
app.use(helmet());

// 2. Cross-origin request configuration.
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

// 3. Request logging before parsers so malformed requests are logged.
app.use(
  pinoHttp({
    level: env.logLevel,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.passwordHash',
        'req.body.otp',
        'req.body.token',
        'req.body.csvContent',
      ],
      censor: '[REDACTED]',
    },
  }),
);

// 4. Request body and cookie parsing.
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// 5. Health endpoints remain outside API rate limiting.
app.use('/health', healthRoutes);

// 6. Apply rate limiting to versioned API routes.
app.use('/api/v1', apiRateLimiter);

// 7. API metadata.
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

// 8. Authentication.
app.use('/api/v1/auth', authRoutes);

// 9. Notifications.
app.use('/api/v1/notifications', notificationRoutes);

// 10. Department management.
app.use('/api/v1/departments', departmentRoutes);

// 11. Account provisioning: HOD creation.
app.use('/api/v1/provisioning', hodRoutes);

// 12. Faculty account provisioning.
app.use('/api/v1/provisioning/faculty', facultyRoutes);

// 13. Batch management.
app.use('/api/v1/provisioning/batches', batchRoutes);

// 14. Section management.
app.use('/api/v1/provisioning', sectionRoutes);

// 15. Mentor roles and batch/section assignments.
app.use('/api/v1/provisioning', mentorRoutes);

// 16. Student account provisioning.
app.use('/api/v1/provisioning', studentRoutes);

// 17. Bulk student import.
app.use('/api/v1/provisioning', studentImportRoutes);

// 18. Handle student-upload-specific errors.
app.use(studentUploadErrorMiddleware);

// 19. Handle unmatched routes.
app.use(notFoundHandler);

// 20. Centralized fallback error handler — must remain last.
app.use(errorHandler);

export default app;