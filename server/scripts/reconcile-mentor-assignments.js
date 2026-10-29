import 'dotenv/config';

import mongoose from 'mongoose';

import { env } from '../src/config/env.js';
import {
  User,
  ACCOUNT_STATUSES,
  USER_ROLES,
} from '../src/models/user.model.js';
import Section from '../src/models/section.model.js';

const APPLY_CHANGES = process.argv.includes('--apply');

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const toId = (value) => {
  if (!value) return null;

  const id = value._id ?? value;

  return isValidObjectId(id) ? String(id) : null;
};

const uniqueIds = (values) =>
  [...new Set(values.filter(Boolean).map(String))];

const sameId = (left, right) =>
  Boolean(left && right && String(left) === String(right));

async function reconcileAssignments() {
  if (!env.mongodbUri) {
    throw new Error(
      'MongoDB URI is missing from the environment configuration.',
    );
  }

  await mongoose.connect(env.mongodbUri);

  console.log('\nMentor–Section Assignment Reconciliation');
  console.log('========================================');
  console.log(`Mode: ${APPLY_CHANGES ? 'APPLY' : 'DRY RUN'}`);

  const mentors = await User.find({
    role: USER_ROLES.MENTOR,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id name email department assignedSections')
    .lean();

  const sections = await Section.find({})
    .select('_id name code department batch status mentor')
    .lean();

  const mentorById = new Map(
    mentors.map((mentor) => [String(mentor._id), mentor]),
  );

  const sectionsById = new Map(
    sections.map((section) => [String(section._id), section]),
  );

  // Find every legacy mentor claim for each section.
  const legacyClaims = new Map();

  for (const mentor of mentors) {
    const mentorId = String(mentor._id);

    for (const assignedSection of mentor.assignedSections ?? []) {
      const sectionId = toId(assignedSection);

      if (!sectionId || !sectionsById.has(sectionId)) {
        console.warn(
          `[ORPHAN] Mentor ${mentorId} references a missing or invalid section.`,
        );

        continue;
      }

      const claims = legacyClaims.get(sectionId) ?? [];

      claims.push(mentorId);
      legacyClaims.set(sectionId, claims);
    }
  }

  const safePlans = [];
  const conflicts = [];
  const invalidAssignments = [];

  for (const section of sections) {
    const sectionId = String(section._id);
    const departmentId = toId(section.department);
    const currentOwnerId = toId(section.mentor);

    const legacyOwnerIds = uniqueIds(
      legacyClaims.get(sectionId) ?? [],
    );

    const allClaimants = uniqueIds([
      currentOwnerId,
      ...legacyOwnerIds,
    ]);

    const sectionIsActive = section.status === 'ACTIVE';

    // Only active sections participate in automatic reconciliation.
    // Inactive sections remain untouched for manual review.
    if (!sectionIsActive) {
      if (allClaimants.length > 0) {
        console.warn(
          `[SKIP INACTIVE] Section ${section.code ?? sectionId} has assignment records.`,
        );
      }

      continue;
    }

    // Do not automatically repair sections with multiple claimants.
    if (allClaimants.length > 1) {
      conflicts.push({
        sectionId,
        sectionCode: section.code ?? 'UNKNOWN',
        claimants: allClaimants,
      });

      console.error(
        `[CONFLICT] Section ${section.code ?? sectionId}: ` +
          `multiple mentor claims (${allClaimants.join(', ')}).`,
      );

      continue;
    }

    // An unassigned section does not need reconciliation.
    if (allClaimants.length === 0) {
      continue;
    }

    const ownerId = allClaimants[0];
    const owner = mentorById.get(ownerId);

    // Never assign a section to an unknown, inactive, or non-mentor user.
    if (!owner) {
      invalidAssignments.push({
        sectionId,
        ownerId,
        reason: 'Owner is not an active mentor.',
      });

      console.error(
        `[INVALID OWNER] Section ${section.code ?? sectionId}: ` +
          `${ownerId} is not an active mentor.`,
      );

      continue;
    }

    const ownerDepartmentId = toId(owner.department);

    // Do not automatically reconcile cross-department assignments.
    if (
      !departmentId ||
      !ownerDepartmentId ||
      !sameId(departmentId, ownerDepartmentId)
    ) {
      invalidAssignments.push({
        sectionId,
        ownerId,
        reason: 'Section and mentor belong to different departments.',
      });

      console.error(
        `[DEPARTMENT MISMATCH] Section ${section.code ?? sectionId}.`,
      );

      continue;
    }

    const sectionOwnerMatches = sameId(currentOwnerId, ownerId);
    const legacyOwnerMatches = legacyOwnerIds.includes(ownerId);

    if (sectionOwnerMatches && legacyOwnerMatches) {
      continue;
    }

    safePlans.push({
      sectionId,
      sectionCode: section.code ?? 'UNKNOWN',
      ownerId,
      updateSectionOwner: !sectionOwnerMatches,
      updateLegacyOwner: !legacyOwnerMatches,
    });
  }

  console.log('\nAudit Summary');
  console.log('-------------');
  console.log(`Active mentors inspected: ${mentors.length}`);
  console.log(`Sections inspected: ${sections.length}`);
  console.log(`Safe reconciliation candidates: ${safePlans.length}`);
  console.log(`Conflicting sections: ${conflicts.length}`);
  console.log(`Invalid assignments: ${invalidAssignments.length}`);

  if (!APPLY_CHANGES) {
    console.log('\nDRY RUN: No database records were modified.');
    console.log(
      'Review the output before running this script with --apply.',
    );

    for (const plan of safePlans) {
      console.log(
        `[PLAN] Section ${plan.sectionCode} -> Mentor ${plan.ownerId}`,
      );
    }

    return;
  }

  let updatedSections = 0;
  let updatedMentors = 0;

  // Reconcile one unambiguous section at a time.
  // Do not rebuild every mentor's assignment array globally.
  for (const plan of safePlans) {
    const section = await Section.findById(plan.sectionId);

    if (!section) {
      console.warn(
        `[SKIP] Section ${plan.sectionCode} no longer exists.`,
      );

      continue;
    }

    const owner = await User.findOne({
      _id: plan.ownerId,
      role: USER_ROLES.MENTOR,
      status: ACCOUNT_STATUSES.ACTIVE,
    });

    if (!owner) {
      console.warn(
        `[SKIP] Mentor ${plan.ownerId} is no longer active.`,
      );

      continue;
    }

    // Recheck department scope immediately before applying changes.
    if (!sameId(section.department, owner.department)) {
      console.error(
        `[SKIP] Department changed for section ${plan.sectionCode}.`,
      );

      continue;
    }

    // Recheck current ownership to avoid overwriting a new conflict.
    const currentOwnerId = toId(section.mentor);

    if (
      currentOwnerId &&
      !sameId(currentOwnerId, plan.ownerId)
    ) {
      console.error(
        `[SKIP CONCURRENT CHANGE] Section ${plan.sectionCode} ` +
          'now has a different owner.',
      );

      continue;
    }

    const otherMentors = await User.find({
      _id: { $ne: owner._id },
      role: USER_ROLES.MENTOR,
      assignedSections: section._id,
    }).select('_id assignedSections');

    const otherMentorClaims = otherMentors.filter((mentor) =>
      (mentor.assignedSections ?? []).some((id) =>
        sameId(id, section._id),
      ),
    );

    // If another mentor claims the section, preserve the records and
    // report the conflict instead of silently removing the assignment.
    if (otherMentorClaims.length > 0) {
      console.error(
        `[SKIP CONFLICT] Section ${plan.sectionCode} is claimed by ` +
          `another mentor: ${otherMentorClaims.map((m) => m._id).join(', ')}`,
      );

      continue;
    }

    if (!currentOwnerId) {
      section.mentor = owner._id;
      await section.save();
      updatedSections += 1;
    }

    const ownerAlreadyHasSection = (
      owner.assignedSections ?? []
    ).some((id) => sameId(id, section._id));

    if (!ownerAlreadyHasSection) {
      await User.updateOne(
        {
          _id: owner._id,
          role: USER_ROLES.MENTOR,
          status: ACCOUNT_STATUSES.ACTIVE,
        },
        {
          $addToSet: {
            assignedSections: section._id,
          },
        },
      );

      updatedMentors += 1;
    }

    console.log(
      `[RECONCILED] Section ${plan.sectionCode} -> Mentor ${owner._id}`,
    );
  }

  console.log('\nApply Summary');
  console.log('-------------');
  console.log(`Section records updated: ${updatedSections}`);
  console.log(`Mentor records updated: ${updatedMentors}`);
  console.log(`Unresolved conflicts preserved: ${conflicts.length}`);

  console.log(
    '\nImportant: This script does not guarantee atomicity against ' +
      'concurrent application requests.',
  );
}

try {
  await reconcileAssignments();
} catch (error) {
  console.error('\nReconciliation failed:', error.message);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}