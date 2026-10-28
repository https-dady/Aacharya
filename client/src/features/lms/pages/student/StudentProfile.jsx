import { useCallback, useEffect, useState } from 'react';

import useAuth from '../../../auth/context/useAuth.js';
import studentProfileService from '../../services/studentProfileService.js';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import LoadingState from '../../components/LoadingState.jsx';

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'ST';

  const parts = name.trim().split(/\s+/).filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'ST'
  );
}

function getText(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }

  return String(value);
}

function formatDate(value) {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function ProfileField({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#858590]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {getText(value)}
      </p>
    </div>
  );
}

function getErrorMessage(error) {
  if (error?.response?.status === 401) {
    return 'Your session may have expired. Please sign in again.';
  }

  if (error?.response?.status === 403) {
    return 'Your student account is not currently active.';
  }

  if (error?.response?.status === 404) {
    return 'No student profile was found for your account.';
  }

  return (
    error?.message ||
    'Unable to load your profile. Please try again.'
  );
}

export default function StudentProfile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await studentProfileService.getMyProfile();

      setProfile(result);
    } catch (error) {
      setProfile(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const displayName =
    profile?.fullName ||
    user?.fullName ||
    user?.name ||
    'Student';

  const email = profile?.email || user?.email || '';

  const departmentName =
    profile?.department?.name || 'Not available';

  const batches = Array.isArray(profile?.batches)
    ? profile.batches
    : [];

  const sections = Array.isArray(profile?.sections)
    ? profile.sections
    : [];

  const batchNames = batches.length
    ? batches.map((batch) => batch.name).filter(Boolean).join(', ')
    : 'Not assigned';

  const sectionNames = sections.length
    ? sections
        .map((section) => {
          const sectionName = section.name || section.code;
          const batchName = section.batch?.name;

          if (sectionName && batchName) {
            return `${sectionName} (${batchName})`;
          }

          return sectionName;
        })
        .filter(Boolean)
        .join(', ')
    : 'Not assigned';

  const academicDetails = [
    {
      label: 'Student ID',
      value: profile?.institutionalId,
    },
    {
      label: 'Role',
      value: profile?.role,
    },
    {
      label: 'Department',
      value: departmentName,
    },
    {
      label: 'Assigned Batches',
      value: batchNames,
    },
    {
      label: 'Assigned Sections',
      value: sectionNames,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title="My Profile"
        description="Review your personal information, academic placement, and account status."
        breadcrumbs={[
          {
            label: 'Dashboard',
            to: '/student/dashboard',
          },
          {
            label: 'My Profile',
          },
        ]}
      />

      {isLoading && (
        <div className="mb-6 rounded-2xl border border-[#343640] bg-[#1D1F27] p-6">
          <LoadingState />
        </div>
      )}

      {!isLoading && errorMessage && (
        <section
          className="mb-6 rounded-2xl border border-rose-400/20 bg-[#1D1F27] p-6"
          aria-live="polite"
        >
          <h2 className="text-base font-semibold text-[#EAEAE6]">
            Unable to load your profile
          </h2>

          <p className="mt-2 text-sm leading-6 text-rose-200">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={loadProfile}
            className={[
              'mt-4 inline-flex min-h-10 items-center justify-center',
              'rounded-xl bg-[#CDB5F7] px-4 py-2',
              'text-sm font-semibold text-[#20172D]',
              'transition-colors hover:bg-[#DDCCFA]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7]',
            ].join(' ')}
          >
            Retry
          </button>
        </section>
      )}

      {!isLoading && profile && (
        <>
          <section className="mb-6 overflow-hidden rounded-2xl border border-[#343640] bg-[#1D1F27]">
            <div className="h-28 bg-gradient-to-r from-[#302744] via-[#252431] to-[#1D1F27]" />

            <div className="px-5 pb-6 sm:px-7">
              <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex min-w-0 items-end gap-4">
                  <div
                    className={[
                      'flex h-20 w-20 shrink-0 items-center justify-center',
                      'rounded-2xl border-4 border-[#1D1F27]',
                      'bg-[#CDB5F7] text-2xl font-bold text-[#20172D]',
                    ].join(' ')}
                    aria-label={`Initials: ${getInitials(displayName)}`}
                  >
                    {getInitials(displayName)}
                  </div>

                  <div className="min-w-0 pb-1">
                    <h2 className="break-words text-xl font-semibold text-[#EAEAE6]">
                      {displayName}
                    </h2>

                    <p className="mt-1 break-words text-sm text-[#A5A6B0]">
                      {email || 'Email unavailable'}
                    </p>

                    <span className="mt-2 inline-flex rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-2.5 py-1 text-xs font-medium text-[#CDB5F7]">
                      {getText(profile.role)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard
              eyebrow="ACCOUNT"
              title="Personal Information"
              description="Information retrieved from your authenticated student account."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileField
                  label="Full Name"
                  value={profile.fullName}
                />

                <ProfileField
                  label="Email Address"
                  value={profile.email}
                />

                <ProfileField
                  label="Student ID"
                  value={profile.institutionalId}
                />

                <ProfileField
                  label="Account Role"
                  value={profile.role}
                />
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="ACADEMICS"
              title="Academic Information"
              description="Your department, batches, and sections assigned by your institution."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {academicDetails.map((detail) => (
                  <ProfileField
                    key={detail.label}
                    label={detail.label}
                    value={detail.value}
                  />
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="mt-6">
            <SectionCard
              eyebrow="ACCOUNT SECURITY"
              title="Account Status"
              description="Current activation and verification information for your account."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileField
                  label="Account Status"
                  value={profile.status}
                />

                <ProfileField
                  label="Account Activated"
                  value={
                    typeof profile.isAccountActivated === 'boolean'
                      ? profile.isAccountActivated
                        ? 'Yes'
                        : 'No'
                      : undefined
                  }
                />

                <ProfileField
                  label="Email Verified"
                  value={
                    typeof profile.isEmailVerified === 'boolean'
                      ? profile.isEmailVerified
                        ? 'Yes'
                        : 'No'
                      : undefined
                  }
                />

                <ProfileField
                  label="Email Verified On"
                  value={formatDate(profile.emailVerifiedAt)}
                />

                <ProfileField
                  label="Account Created"
                  value={formatDate(profile.createdAt)}
                />

                <ProfileField
                  label="Last Profile Update"
                  value={formatDate(profile.updatedAt)}
                />
              </div>
            </SectionCard>
          </div>

          <div className="mt-6">
            <EmptyState
              title="Need academic assistance?"
              description="Review your attendance or academic results to keep track of your progress."
              icon={
                <span aria-hidden="true" className="text-2xl">
                  ↗
                </span>
              }
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <a
                    href="/student/attendance"
                    className={[
                      'inline-flex min-h-10 items-center justify-center',
                      'rounded-xl border border-[#454650] px-4 py-2',
                      'text-sm font-semibold text-[#CDB5F7]',
                      'transition-colors hover:border-[#CDB5F7]',
                      'focus-visible:outline-none focus-visible:ring-2',
                      'focus-visible:ring-[#CDB5F7]',
                    ].join(' ')}
                  >
                    View Attendance
                  </a>

                  <a
                    href="/student/results"
                    className={[
                      'inline-flex min-h-10 items-center justify-center',
                      'rounded-xl border border-[#454650] px-4 py-2',
                      'text-sm font-semibold text-[#CDB5F7]',
                      'transition-colors hover:border-[#CDB5F7]',
                      'focus-visible:outline-none focus-visible:ring-2',
                      'focus-visible:ring-[#CDB5F7]',
                    ].join(' ')}
                  >
                    View Results
                  </a>
                </div>
              }
            />
          </div>
        </>
      )}
    </div>
  );
}