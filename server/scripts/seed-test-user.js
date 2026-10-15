import dotenv from 'dotenv';

dotenv.config({ path: 'server/.env' });
dotenv.config({ path: '.env' });

import mongoose from 'mongoose';

import { env } from '../src/config/env.js';
import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../src/models/user.model.js';
import { hashPassword } from '../src/services/auth/password.service.js';

const TEST_USER = {
  institutionalId: 'STU001',
  fullName: 'Aacharya Test Student',
  email: 'student.test@example.com',
  role: USER_ROLES.STUDENT,
  status: ACCOUNT_STATUSES.ACTIVE,
};

async function seedTestUser() {
  if (env.nodeEnv !== 'development') {
    throw new Error(
      'Test user seeding is allowed only in development.',
    );
  }

  const mongodbUri = process.env.MONGODB_URI?.trim();

  if (!mongodbUri) {
    throw new Error('MONGODB_URI is not configured.');
  }

  await mongoose.connect(mongodbUri);

  const existingUser = await User.findOne({
    institutionalId: TEST_USER.institutionalId,
  });

  if (existingUser) {
    console.log(
      'Test user already exists. No account data was modified.',
    );
    return;
  }

  const passwordHash = await hashPassword('TestPassword123!');

  await User.create({
    ...TEST_USER,
    passwordHash,
  });

  console.log('Development test user created successfully.');
  console.log('Institutional ID: STU001');
  console.log('Password: TestPassword123!');
}

try {
  await seedTestUser();
} catch (error) {
  console.error('Test user seeding failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}