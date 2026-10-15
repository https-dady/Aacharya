import 'dotenv/config';

import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import mongoose from 'mongoose';

import {
  connectDatabase,
  disconnectDatabase,
} from '../src/config/database.js';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../src/models/user.model.js';

import {
  hashPassword,
} from '../src/services/auth/password.service.js';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

function ask(question) {
  return rl.question(question);
}

async function askHidden(question) {
  stdout.write(question);

  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error(
      'Hidden password input requires an interactive terminal.',
    );
  }

  stdin.setRawMode(true);
  stdin.resume();

  let password = '';

  try {
    while (true) {
      const character = await new Promise((resolve) => {
        stdin.once('data', (data) => {
          resolve(data.toString());
        });
      });

      if (character === '\u0003') {
        throw new Error('Password input cancelled.');
      }

      if (character === '\r' || character === '\n') {
        stdout.write('\n');
        return password;
      }

      if (character === '\u007f' || character === '\b') {
        password = password.slice(0, -1);
        continue;
      }

      if (character.length === 1 && character >= ' ') {
        password += character;
      }
    }
  } finally {
    stdin.setRawMode(false);
  }
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function validateInput({
  institutionalId,
  fullName,
  email,
  password,
  passwordConfirmation,
}) {
  if (!institutionalId || institutionalId.length < 2 || institutionalId.length > 50) {
    throw new Error(
      'Institutional ID must contain between 2 and 50 characters.',
    );
  }

  if (!fullName || fullName.length < 2 || fullName.length > 100) {
    throw new Error(
      'Full name must contain between 2 and 100 characters.',
    );
  }

  if (
    !email
    || email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error('A valid email address is required.');
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(
      `Password must contain at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
  }

  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    throw new Error(
      `Password cannot exceed ${PASSWORD_MAX_BYTES} UTF-8 bytes.`,
    );
  }

  if (password !== passwordConfirmation) {
    throw new Error('Passwords do not match.');
  }
}

async function main() {
  let connected = false;

  try {
    await connectDatabase();
    connected = true;

    const existingAdmin = await User.exists({
      role: USER_ROLES.SUPER_ADMIN,
    });

    if (existingAdmin) {
      throw new Error(
        'A Super Admin already exists. Bootstrap cannot run again.',
      );
    }

    const institutionalId = (await ask('Super Admin institutional ID: '))
      .trim()
      .toUpperCase();

    const fullName = (await ask('Super Admin full name: ')).trim();

    const email = normalizeEmail(
      await ask('Super Admin email: '),
    );

    const password = await askHidden('Super Admin password: ');

    const passwordConfirmation = await askHidden(
      'Confirm password: ',
    );

    validateInput({
      institutionalId,
      fullName,
      email,
      password,
      passwordConfirmation,
    });

    const passwordHash = await hashPassword(password);

    await User.create({
      institutionalId,
      fullName,
      email,
      passwordHash,
      role: USER_ROLES.SUPER_ADMIN,
      status: ACCOUNT_STATUSES.ACTIVE,
      isEmailVerified: false,
      emailVerifiedAt: null,
    });

    console.log('\nSuper Admin created successfully.');
    console.log('Email verification is pending.');
    console.log('Keep the credentials in a secure password manager.');
  } finally {
    rl.close();

    if (connected && mongoose.connection.readyState !== 0) {
      await disconnectDatabase();
    }
  }
}

main().catch((error) => {
  console.error('\nSuper Admin bootstrap failed:', error.message);
  process.exitCode = 1;
});