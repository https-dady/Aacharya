import { config as loadEnv } from 'dotenv';

import path from 'node:path';

import {
  fileURLToPath,
} from 'node:url';

const scriptDirectory = path.dirname(
  fileURLToPath(import.meta.url),
);

const serverEnvironmentPath = path.resolve(
  scriptDirectory,
  '../.env',
);

const environmentResult = loadEnv({
  path: serverEnvironmentPath,
});

if (environmentResult.error) {
  throw new Error(
    `Unable to load server environment: ${environmentResult.error.message}`,
  );
}

const {
  connectDatabase,
  disconnectDatabase,
} = await import('../src/config/database.js');

const {
  User,
  USER_ROLES,
} = await import('../src/models/user.model.js');

const APPLY_CHANGES = process.argv.includes('--apply');

function getRequiredCapabilities(user) {
  const roles = new Set(
    Array.isArray(user.roles)
      ? user.roles
      : [],
  );

  if (user.role) {
    roles.add(user.role);
  }

  const hasMentorCapability = (
    user.role === USER_ROLES.MENTOR
    || roles.has(USER_ROLES.MENTOR)
  );

  const hasHodCapability = (
    user.role === USER_ROLES.HOD
    || roles.has(USER_ROLES.HOD)
  );

  if (hasMentorCapability || hasHodCapability) {
    roles.add(USER_ROLES.FACULTY);
  }

  return [...roles];
}

function arraysEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);

  return left.every((role) => rightSet.has(role));
}

async function reconcileTeachingCapabilities() {
  console.log('\nTeaching Capability Reconciliation');
  console.log('===================================');

  console.log(
    `Mode: ${APPLY_CHANGES ? 'APPLY' : 'DRY RUN'}`,
  );

  /*
   * Uses the application's existing database connection.
   * This also applies its configured MongoDB DNS resolvers.
   */
  await connectDatabase();

  const users = await User.find({
    $or: [
      {
        role: {
          $in: [
            USER_ROLES.FACULTY,
            USER_ROLES.MENTOR,
            USER_ROLES.HOD,
          ],
        },
      },
      {
        roles: {
          $in: [
            USER_ROLES.FACULTY,
            USER_ROLES.MENTOR,
            USER_ROLES.HOD,
          ],
        },
      },
    ],
  })
    .select('_id institutionalId fullName role roles status department')
    .lean()
    .exec();

  const plans = [];

  for (const user of users) {
    const currentRoles = Array.isArray(user.roles)
      ? user.roles
      : [];

    const requiredRoles = getRequiredCapabilities(user);

    if (!arraysEqual(currentRoles, requiredRoles)) {
      plans.push({
        userId: String(user._id),
        institutionalId: user.institutionalId,
        fullName: user.fullName,
        primaryRole: user.role,
        currentRoles,
        requiredRoles,
      });
    }
  }

  console.log('\nAudit Summary');
  console.log('-------------');

  console.log(`Accounts inspected: ${users.length}`);

  console.log(
    `Accounts requiring reconciliation: ${plans.length}`,
  );

  for (const plan of plans) {
    console.log(
      `\n[${plan.primaryRole}] ${plan.fullName} (${plan.institutionalId})`,
    );

    console.log(
      `Current roles: ${plan.currentRoles.join(', ') || 'NONE'}`,
    );

    console.log(
      `Required roles: ${plan.requiredRoles.join(', ')}`,
    );
  }

  if (!APPLY_CHANGES) {
    console.log('\nDRY RUN COMPLETED');

    console.log(
      'No account records were modified.',
    );

    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;

  for (const plan of plans) {
    const result = await User.updateOne(
      {
        _id: plan.userId,
        role: plan.primaryRole,
      },
      {
        $set: {
          roles: plan.requiredRoles,
        },
      },
      {
        runValidators: true,
      },
    ).exec();

    if (result.matchedCount !== 1) {
      skippedCount += 1;

      console.warn(
        `[SKIPPED] Account ${plan.userId} changed during reconciliation.`,
      );

      continue;
    }

    updatedCount += 1;

    console.log(
      `[UPDATED] ${plan.institutionalId}: ${plan.requiredRoles.join(', ')}`,
    );
  }

  console.log('\nApply Summary');
  console.log('-------------');

  console.log(`Accounts updated: ${updatedCount}`);

  console.log(`Accounts skipped: ${skippedCount}`);

  console.log('Primary roles were preserved.');
}

try {
  await reconcileTeachingCapabilities();
} catch (error) {
  console.error(
    '\nTeaching capability reconciliation failed:',
    error.message,
  );

  process.exitCode = 1;
} finally {
  await disconnectDatabase().catch((error) => {
    console.error(
      'Database disconnection failed:',
      error.message,
    );
  });
}