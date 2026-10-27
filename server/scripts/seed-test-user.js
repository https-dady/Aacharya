
import dns from 'node:dns';
import dotenv from 'dotenv';

dotenv.config({ path: 'server/.env' });
dotenv.config({ path: '.env' });

const { default: mongoose } = await import('mongoose');

const { env } = await import('../src/config/env.js');

const {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} = await import('../src/models/user.model.js');

const { hashPassword } = await import(
  '../src/services/auth/password.service.js'
);

const TEST_USER = {
  institutionalId: 'STU001',
  fullName: 'Aacharya Test Student',
  email: 'student.test@example.com',
  role: USER_ROLES.STUDENT,
  status: ACCOUNT_STATUSES.ACTIVE,
};

function configureMongoDns() {
  if (!process.env.MONGODB_URI?.startsWith('mongodb+srv://')) {
    return;
  }

  const configuredServers = process.env.MONGODB_DNS_SERVERS
    ?.split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  const dnsServers = configuredServers?.length
    ? configuredServers
    : ['8.8.8.8', '1.1.1.1'];

  dns.setServers(dnsServers);

  console.log(
    `MongoDB DNS resolver configured (${dnsServers.length} servers).`,
  );
}

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

  configureMongoDns();

  await mongoose.connect(mongodbUri, {
    serverSelectionTimeoutMS: 15000,
  });

  console.log('MongoDB connected.');

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
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
