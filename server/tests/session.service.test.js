import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import {
  afterEach,
  describe,
  it,
  mock,
} from 'node:test';

import { RefreshSession } from '../src/models/refresh-session.model.js';
import {
  User,
  ACCOUNT_STATUSES,
} from '../src/models/user.model.js';

import {
  createRefreshSession,
  rotateRefreshSession,
  revokeRefreshSession,
} from '../src/services/auth/session.service.js';

import {
  generateRefreshToken,
} from '../src/services/auth/token.service.js';

const TEST_USER_ID = new mongoose.Types.ObjectId();

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createMockQuery(result) {
  return {
    select() {
      return this;
    },

    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
}

afterEach(() => {
  mock.restoreAll();
});

describe('Refresh session service', () => {
  it('creates a refresh session with a hashed token', async () => {
    let savedSession;

    mock.method(RefreshSession, 'create', async (session) => {
      savedSession = session;
      return session;
    });

    const user = {
      _id: TEST_USER_ID,
      id: TEST_USER_ID.toString(),
    };

    const refreshToken = generateRefreshToken(user.id);

    await createRefreshSession(user, refreshToken);

    assert.ok(savedSession);
    assert.equal(savedSession.user, user._id);
    assert.equal(savedSession.tokenHash, hashToken(refreshToken));
    assert.notEqual(savedSession.tokenHash, refreshToken);
    assert.ok(savedSession.expiresAt instanceof Date);
    assert.equal(typeof savedSession.familyId, 'string');
  });

  it('rotates an active refresh session', async () => {
    const oldToken = generateRefreshToken(TEST_USER_ID.toString());
    const oldTokenHash = hashToken(oldToken);
    const familyId = crypto.randomUUID();

    const session = {
      _id: new mongoose.Types.ObjectId(),
      user: TEST_USER_ID,
      familyId,
      tokenHash: oldTokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      replacedByTokenHash: null,
    };

    let findOneFilter;
    let claimFilter;
    let claimUpdate;
    let claimOptions;
    let createdReplacement;
    let updateArguments;

    mock.method(RefreshSession, 'findOne', (filter) => {
      findOneFilter = filter;
      return createMockQuery(session);
    });

    mock.method(
      RefreshSession,
      'findOneAndUpdate',
      (filter, update, options) => {
        claimFilter = filter;
        claimUpdate = update;
        claimOptions = options;

        if (
          filter.revokedAt !== null
          || session.revokedAt !== null
        ) {
          return createMockQuery(null);
        }

        const previousSession = {
          ...session,
          revokedAt: session.revokedAt,
        };

        session.revokedAt = update.$set.revokedAt;

        return createMockQuery(previousSession);
      },
    );

    mock.method(RefreshSession, 'create', async (document) => {
      createdReplacement = document;
      return document;
    });

    mock.method(RefreshSession, 'updateOne', async (...args) => {
      updateArguments = args;
      return { modifiedCount: 1 };
    });

    mock.method(RefreshSession, 'updateMany', async () => ({
      modifiedCount: 0,
    }));

    mock.method(User, 'findById', async () => ({
      id: TEST_USER_ID.toString(),
      _id: TEST_USER_ID,
      status: ACCOUNT_STATUSES.ACTIVE,
    }));

    const result = await rotateRefreshSession(oldToken);

    assert.equal(findOneFilter.tokenHash, oldTokenHash);
    assert.equal(findOneFilter.user, TEST_USER_ID.toString());

    assert.equal(
      claimFilter._id.toString(),
      session._id.toString(),
    );
    assert.equal(claimFilter.revokedAt, null);
    assert.ok(claimFilter.expiresAt.$gt instanceof Date);

    assert.deepEqual(claimUpdate, {
      $set: {
        revokedAt: session.revokedAt,
      },
    });
    assert.equal(claimOptions.new, false);

    assert.ok(session.revokedAt instanceof Date);
    assert.ok(createdReplacement);

    assert.equal(
      createdReplacement.user.toString(),
      TEST_USER_ID.toString(),
    );
    assert.equal(createdReplacement.familyId, familyId);
    assert.equal(
      createdReplacement.tokenHash,
      hashToken(result.refreshToken),
    );
    assert.ok(createdReplacement.expiresAt instanceof Date);

    assert.notEqual(result.refreshToken, oldToken);
    assert.equal(result.userId, TEST_USER_ID.toString());

    assert.ok(updateArguments);
    assert.equal(
      updateArguments[0]._id.toString(),
      session._id.toString(),
    );
    assert.equal(
      updateArguments[1].$set.replacedByTokenHash,
      hashToken(result.refreshToken),
    );
  });

  it('rejects an invalid refresh token', async () => {
    await assert.rejects(
      rotateRefreshSession('not-a-valid-refresh-token'),
      {
        statusCode: 401,
        code: 'INVALID_REFRESH_SESSION',
      },
    );
  });

  it('revokes an existing refresh session', async () => {
    const refreshToken = generateRefreshToken(TEST_USER_ID.toString());

    let updateArguments;

    mock.method(RefreshSession, 'updateOne', async (...args) => {
      updateArguments = args;
      return { modifiedCount: 1 };
    });

    await revokeRefreshSession(refreshToken);

    assert.ok(updateArguments);
    assert.equal(
      updateArguments[0].tokenHash,
      hashToken(refreshToken),
    );
    assert.equal(
      updateArguments[0].user,
      TEST_USER_ID.toString(),
    );
    assert.equal(updateArguments[0].revokedAt, null);
    assert.ok(updateArguments[1].$set.revokedAt instanceof Date);
  });

  it('does not throw when revoking an invalid refresh token', async () => {
    await assert.doesNotReject(
      revokeRefreshSession('invalid-token'),
    );
  });
});