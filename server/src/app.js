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

import studentProfileRoutes from './routes/student-profile.routes.js';
import courseRoutes from './routes/course.routes.js';
import studentAssignmentRoutes from './routes/student-assignment.routes.js';
import studentQuizRoutes from './routes/student-quiz.routes.js';
import studentQuizAttemptRoutes from './routes/student-quiz-attempt.routes.js';
import studentQuizResultRoutes from './routes/student-quiz-result.routes.js';
import studentAttendanceRoutes from './routes/student-attendance.routes.js';

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
        'req.body.passwordHash',
        'req.body.currentPassword',
        'req.body.newPassword',
        'req.body.otp',
        'req.body.token',
        'req.body.accessToken',
        'req.body.refreshToken',
        'req.body.resetToken',
        'req.body.passwordResetToken',
        'req.body.verificationToken',
        'req.body.emailVerificationToken',
        'req.body.csvContent',
      ],
      censor: '[REDACTED]',
    },
  }),
);

// Health endpoints remain outside API rate limiting.
app.use('/health', healthRoutes);

// API-wide rate limiting.
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

// Authentication.
app.use('/api/v1/auth', authRoutes);

// Notifications.
app.use('/api/v1/notifications', notificationRoutes);

// Department management.
app.use('/api/v1/departments', departmentRoutes);

// Account provisioning: HOD creation.
app.use('/api/v1/provisioning', hodRoutes);

// Faculty account provisioning.
app.use('/api/v1/provisioning/faculty', facultyRoutes);

// Batch management.
app.use('/api/v1/provisioning/batches', batchRoutes);

// Section management.
app.use('/api/v1/provisioning', sectionRoutes);

// Mentor role and batch/section assignments.
app.use('/api/v1/provisioning', mentorRoutes);

// Student account provisioning.
app.use('/api/v1/provisioning', studentRoutes);

// Bulk student import.
app.use('/api/v1/provisioning', studentImportRoutes);

// Student profile.
app.use('/api/v1/student-profile', studentProfileRoutes);

// Student courses.
app.use('/api/v1/courses', courseRoutes);

// Student assignments.
app.use('/api/v1/assignments', studentAssignmentRoutes);

// Student quizzes.
app.use('/api/v1/quizzes', studentQuizRoutes);

// Student quiz attempts: start, retrieve, answer, submit.
app.use('/api/v1/quizzes', studentQuizAttemptRoutes);

// Student quiz results.
app.use('/api/v1/quiz-results', studentQuizResultRoutes);

// Student attendance.
app.use('/api/v1/attendance', studentAttendanceRoutes);

// Error handling.
app.use(studentUploadErrorMiddleware);

app.use(notFoundHandler);

app.use(errorHandler);

export default app;