import crypto from 'node:crypto';
import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../../models/user.model.js';

import { Batch } from '../../models/batch.model.js';
import { Section } from '../../models/section.model.js';

import { RefreshSession } from '../../models/refresh-session.model.js';

import {
  StudentActivationChallenge,
  STUDENT_ACTIVATION_STATUSES,
} from '../../models/student-activation-challenge.model.js';

import { hashPassword } from '../auth/password.service.js';
import { emailClient } from '../email/email.service.js';
import { env } from '../../config/env.js';

const ACTIVATION_TOKEN_BYTES = 32;
const ACTIVATION_EXPIRY_MS = 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

function createServiceError(
  statusCode,
  code,
  message,
) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function isValidObjectId(value) {
  return (
    typeof value === 'string'
    && mongoose.isValidObjectId(value)
  );
}

function normalizeObjectIdList(values = []) {
  return values.map((value) => value.toString());
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const replacements = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return replacements[character];
  });
}

function hashActivationToken(token) {
  return crypto
    .createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}

function tokenHashesMatch(expectedHash, suppliedHash) {
  if (
    typeof expectedHash !== 'string'
    || typeof suppliedHash !== 'string'
  ) {
    return false;
  }

  const expected = Buffer.from(expectedHash, 'hex');
  const supplied = Buffer.from(suppliedHash, 'hex');

  return (
    expected.length === supplied.length
    && expected.length === 32
    && crypto.timingSafeEqual(expected, supplied)
  );
}

function createActivationEmail({
  studentName,
  activationUrl,
  expiresAt,
}) {
  const safeName = escapeHtml(studentName);
  const safeUrl = escapeHtml(activationUrl);
  const expiryText = expiresAt.toUTCString();

  return {
    subject: 'Activate your Aacharya LMS account',

    textContent: [
      `Hello ${studentName},`,
      '',
      'Your Aacharya LMS account is ready for activation.',
      'Open the link below to verify your email and set your password:',
      activationUrl,
      '',
      `This link expires at ${expiryText}.`,
      'If you did not expect this email, contact your institution.',
    ].join('\n'),

    htmlContent: `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Activate your Aacharya LMS account</title>
        </head>
        <body style="margin:0;padding:24px;background:#14161C;font-family:Arial,sans-serif;color:#EAEAE6;">
          <main style="max-width:560px;margin:0 auto;padding:32px;border:1px solid #343640;border-radius:16px;background:#1D1F27;">
            <h1 style="margin-top:0;font-size:24px;">Welcome to Aacharya LMS</h1>

            <p>Hello ${safeName},</p>

            <p>
              Your institutional account is ready. Activate it by
              verifying your email address and setting your password.
            </p>

            <p style="margin:28px 0;">
              <a
                href="${safeUrl}"
                style="display:inline-block;padding:13px 20px;border-radius:10px;background:#CDB5F7;color:#191621;text-decoration:none;font-weight:bold;"
              >
                Activate account
              </a>
            </p>

            <p style="font-size:14px;line-height:1.6;color:#B8B8C2;">
              This single-use link expires at ${escapeHtml(expiryText)}.
              If you did not expect this email, contact your institution.
            </p>
          </main>
        </body>
      </html>
    `,
  };
}

async function getAuthorizedActivationScope({
  mentorId,
  studentId,
}) {
  if (
    !isValidObjectId(mentorId)
    || !isValidObjectId(studentId)
  ) {
    throw createServiceError(
      400,
      'INVALID_IDENTIFIER',
      'A valid mentor ID and student ID are required.',
    );
  }

  const mentor = await User.findById(mentorId)
    .select(
      '_id role status department assignedBatches assignedSections',
    )
    .exec();

  if (
    !mentor
    || mentor.role !== USER_ROLES.MENTOR
    || mentor.status !== ACCOUNT_STATUSES.ACTIVE
  ) {
    throw createServiceError(
      403,
      'MENTOR_NOT_AUTHORIZED',
      'Only an active mentor can request student activation.',
    );
  }

  const student = await User.findOne({
    _id: studentId,
    role: USER_ROLES.STUDENT,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select(
      '_id institutionalId fullName email role status department assignedBatches assignedSections isAccountActivated isEmailVerified',
    )
    .exec();

  if (!student) {
    throw createServiceError(
      404,
      'STUDENT_NOT_FOUND',
      'The active student account could not be found.',
    );
  }

  if (
    !mentor.department
    || !student.department
    || mentor.department.toString() !== student.department.toString()
  ) {
    throw createServiceError(
      403,
      'STUDENT_OUTSIDE_DEPARTMENT',
      'You cannot activate a student outside your department.',
    );
  }

  if (student.isAccountActivated === true) {
    throw createServiceError(
      409,
      'STUDENT_ALREADY_ACTIVATED',
      'This student account has already been activated.',
    );
  }

  if (
    typeof student.email !== 'string'
    || !student.email.trim()
  ) {
    throw createServiceError(
      422,
      'STUDENT_EMAIL_REQUIRED',
      'A registered student email address is required for activation.',
    );
  }

  const mentorBatchIds = normalizeObjectIdList(
    mentor.assignedBatches || [],
  );

  const mentorSectionIds = normalizeObjectIdList(
    mentor.assignedSections || [],
  );

  const studentBatchIds = normalizeObjectIdList(
    student.assignedBatches || [],
  );

  const studentSectionIds = normalizeObjectIdList(
    student.assignedSections || [],
  );

  const commonSectionIds = mentorSectionIds.filter(
    (sectionId) => studentSectionIds.includes(sectionId),
  );

  const commonBatchIds = mentorBatchIds.filter(
    (batchId) => studentBatchIds.includes(batchId),
  );

  if (
    commonSectionIds.length === 0
    || commonBatchIds.length === 0
  ) {
    throw createServiceError(
      403,
      'STUDENT_NOT_ASSIGNED',
      'You can only activate students in your assigned batches and sections.',
    );
  }

  const section = await Section.findOne({
    _id: { $in: commonSectionIds },
    batch: { $in: commonBatchIds },
    department: mentor.department,
    status: 'ACTIVE',
  })
    .select('_id batch department status')
    .exec();

  if (!section) {
    throw createServiceError(
      403,
      'ACTIVE_SECTION_NOT_ASSIGNED',
      'No active section shared by this mentor and student was found.',
    );
  }

  const batch = await Batch.findOne({
    _id: section.batch,
    department: mentor.department,
    status: 'ACTIVE',
  })
    .select('_id department status')
    .exec();

  if (!batch) {
    throw createServiceError(
      409,
      'BATCH_UNAVAILABLE',
      'The student batch is inactive or unavailable.',
    );
  }

  return {
    mentor,
    student,
    section,
    batch,
  };
}

/**
 * Create and email a single-use activation challenge.
 *
 * The raw token is sent only through the activation email.
 * Only its SHA-256 hash is persisted in MongoDB.
 */
export async function createStudentActivationChallenge({
  mentorId,
  studentId,
}) {
  const {
    mentor,
    student,
    section,
    batch,
  } = await getAuthorizedActivationScope({
    mentorId,
    studentId,
  });

  const now = new Date();

  const expiresAt = new Date(
    now.getTime() + ACTIVATION_EXPIRY_MS,
  );

  const rawToken = crypto
    .randomBytes(ACTIVATION_TOKEN_BYTES)
    .toString('base64url');

  const challengeHash = hashActivationToken(rawToken);

  const session = await mongoose.startSession();

  let challenge;

  try {
    await session.withTransaction(async () => {
      await StudentActivationChallenge.updateMany(
        {
          student: student._id,
          status: STUDENT_ACTIVATION_STATUSES.PENDING,
        },
        {
          $set: {
            status: STUDENT_ACTIVATION_STATUSES.REVOKED,
            revokedAt: now,
          },
        },
        { session },
      );

      const createdChallenges = await StudentActivationChallenge.create(
        [
          {
            student: student._id,
            issuedBy: mentor._id,
            department: student.department,
            batch: batch._id,
            section: section._id,
            challengeHash,
            status: STUDENT_ACTIVATION_STATUSES.PENDING,
            expiresAt,
            failedAttempts: 0,
          },
        ],
        { session },
      );

      [challenge] = createdChallenges;
    });
  } finally {
    await session.endSession();
  }

  const clientUrl = env.clientUrl.replace(/\/+$/, '');

  const activationUrl = new URL(
    '/activate-account',
    `${clientUrl}/`,
  );

  activationUrl.searchParams.set(
    'challengeId',
    challenge._id.toString(),
  );

  activationUrl.searchParams.set(
    'token',
    rawToken,
  );

  const email = createActivationEmail({
    studentName: student.fullName,
    activationUrl: activationUrl.toString(),
    expiresAt,
  });

  try {
    await emailClient.sendTransactionalEmail({
      to: student.email,
      subject: email.subject,
      textContent: email.textContent,
      htmlContent: email.htmlContent,
    });
  } catch (error) {
    await StudentActivationChallenge.updateOne(
      {
        _id: challenge._id,
        status: STUDENT_ACTIVATION_STATUSES.PENDING,
      },
      {
        $set: {
          status: STUDENT_ACTIVATION_STATUSES.REVOKED,
          revokedAt: new Date(),
        },
      },
    ).catch(() => {});

    throw error;
  }

  return {
    challengeId: challenge._id.toString(),
    expiresAt,
    status: STUDENT_ACTIVATION_STATUSES.PENDING,
    deliveryStatus: 'SENT',
  };
}

async function recordFailedActivationAttempt(challengeId) {
  const now = new Date();

  const updatedChallenge =
    await StudentActivationChallenge.findOneAndUpdate(
      {
        _id: challengeId,
        status: STUDENT_ACTIVATION_STATUSES.PENDING,
        expiresAt: { $gt: now },
        failedAttempts: { $lt: MAX_FAILED_ATTEMPTS },
      },
      {
        $inc: {
          failedAttempts: 1,
        },
      },
      {
        new: true,
      },
    )
      .select('_id failedAttempts')
      .exec();

  if (
    updatedChallenge
    && updatedChallenge.failedAttempts >= MAX_FAILED_ATTEMPTS
  ) {
    await StudentActivationChallenge.updateOne(
      {
        _id: updatedChallenge._id,
        status: STUDENT_ACTIVATION_STATUSES.PENDING,
        failedAttempts: { $gte: MAX_FAILED_ATTEMPTS },
      },
      {
        $set: {
          status: STUDENT_ACTIVATION_STATUSES.LOCKED,
          lockedAt: now,
        },
      },
    );
  }
}

/**
 * Consume an activation challenge and set the student's password.
 *
 * Successful activation verifies the email and invalidates existing
 * sessions so no older credentials remain usable.
 */
export async function activateStudentAccount({
  challengeId,
  activationToken,
  newPassword,
}) {
  if (!isValidObjectId(challengeId)) {
    throw createServiceError(
      400,
      'INVALID_ACTIVATION_CHALLENGE',
      'The activation link is invalid or expired.',
    );
  }

  if (
    typeof activationToken !== 'string'
    || activationToken.length < 32
    || activationToken.length > 128
  ) {
    throw createServiceError(
      400,
      'INVALID_ACTIVATION_TOKEN',
      'The activation link is invalid or expired.',
    );
  }

  let passwordHash;

  try {
    passwordHash = await hashPassword(newPassword);
  } catch (error) {
    throw createServiceError(
      422,
      'INVALID_PASSWORD',
      error.message || 'The new password is invalid.',
    );
  }

  const suppliedTokenHash = hashActivationToken(activationToken);
  const session = await mongoose.startSession();

  let activationResult;
  let invalidToken = false;

  try {
    await session.withTransaction(async () => {
      const challenge = await StudentActivationChallenge.findById(
        challengeId,
      )
        .select('+challengeHash')
        .session(session)
        .exec();

      if (
        !challenge
        || challenge.status !== STUDENT_ACTIVATION_STATUSES.PENDING
        || challenge.expiresAt <= new Date()
        || challenge.failedAttempts >= MAX_FAILED_ATTEMPTS
      ) {
        throw createServiceError(
          400,
          'INVALID_ACTIVATION_CHALLENGE',
          'The activation link is invalid, expired, or no longer usable.',
        );
      }

      if (
        !tokenHashesMatch(
          challenge.challengeHash,
          suppliedTokenHash,
        )
      ) {
        invalidToken = true;
        return;
      }

      const now = new Date();

      const student = await User.findOne({
        _id: challenge.student,
        role: USER_ROLES.STUDENT,
        status: ACCOUNT_STATUSES.ACTIVE,
        department: challenge.department,
        assignedBatches: challenge.batch,
        assignedSections: challenge.section,
        isAccountActivated: false,
      })
        .select('+tokenVersion +passwordHash')
        .session(session)
        .exec();

      if (!student) {
        throw createServiceError(
          409,
          'STUDENT_ACTIVATION_UNAVAILABLE',
          'This student account is already activated or is no longer eligible.',
        );
      }

      student.passwordHash = passwordHash;
      student.passwordChangedAt = now;
      student.isAccountActivated = true;
      student.isEmailVerified = true;
      student.emailVerifiedAt = now;
      student.tokenVersion = (student.tokenVersion ?? 0) + 1;

      await student.save({ session });

      challenge.status = STUDENT_ACTIVATION_STATUSES.CONSUMED;
      challenge.consumedAt = now;

      await challenge.save({ session });

      await RefreshSession.updateMany(
        {
          user: student._id,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: now,
            familyRevokedAt: now,
          },
        },
        { session },
      );

      activationResult = {
        activated: true,
        emailVerified: true,
      };
    });
  } finally {
    await session.endSession();
  }

  if (invalidToken) {
    await recordFailedActivationAttempt(challengeId);

    throw createServiceError(
      400,
      'INVALID_ACTIVATION_TOKEN',
      'The activation link is invalid or expired.',
    );
  }

  return activationResult;
}