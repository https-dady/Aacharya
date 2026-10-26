import { Link } from 'react-router-dom';

import useAuth from '../../../auth/context/useAuth.js';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

function DetailField({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#383943] bg-[#26272B]/60 p-4">
      <p className="text-xs font-medium text-[#92929F]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium leading-6 text-[#EAEAE6]">
        {value || 'Not available'}
      </p>
    </div>
  );
}

function getDisplayName(user) {
  return (
    user?.fullName?.trim() ||
    user?.name?.trim() ||
    'HOD'
  );
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'HD';
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatRole(role) {
  if (typeof role !== 'string' || !role.trim()) {
    return 'Not available';
  }

  return role
    .trim()
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ');
}

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getDepartmentName(department) {
  if (typeof department === 'string') {
    return department || 'Not available';
  }

  return department?.name || 'Not available';
}

export default function HodProfile() {
  const { user } = useAuth();

  const fullName = getDisplayName(user);
  const initials = getInitials(fullName);
  const emailVerified = user?.isEmailVerified === true;

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="My Profile"
        description="Review your account information and verification status."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'My Profile',
          },
        ]}
      />

      <section
        aria-label="Profile overview"
        className="mb-6 overflow-hidden rounded-2xl border border-[#343640] bg-[#1D1F27]"
      >
        <div className="h-1.5 bg-gradient-to-r from-[#CDB5F7] via-[#A997D9] to-[#E5DF98]" />

        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
          <div
            aria-label={`Profile initials: ${initials}`}
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#CDB5F7]/30 bg-[#CDB5F7]/10 text-2xl font-semibold tracking-wide text-[#CDB5F7]"
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#92929F]">
              Account Profile
            </p>

            <h2 className="mt-2 break-words text-2xl font-semibold tracking-tight text-[#EAEAE6]">
              {fullName}
            </h2>

            <p className="mt-1 break-all text-sm text-[#A5A6B0]">
              {user?.email || 'Email not available'}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-3 py-1 text-xs font-medium text-[#CDB5F7]">
                {formatRole(user?.role)}
              </span>

              <StatusBadge
                status={emailVerified ? 'active' : 'pending'}
                size="sm"
              />
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        eyebrow="PERSONAL INFORMATION"
        title="Account Details"
        description="Information associated with your authenticated HOD account."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailField
            label="Full Name"
            value={user?.fullName || user?.name}
          />

          <DetailField
            label="Institutional ID"
            value={user?.institutionalId}
          />

          <DetailField
            label="Email Address"
            value={user?.email}
          />

          <DetailField
            label="Account Role"
            value={formatRole(user?.role)}
          />

          <DetailField
            label="Department"
            value={getDepartmentName(user?.department)}
          />

          <DetailField
            label="Account Created"
            value={formatDate(user?.createdAt)}
          />
        </div>
      </SectionCard>

      <div className="mt-6">
        <SectionCard
          eyebrow="ACCOUNT SECURITY"
          title="Email Verification"
          description="Review the verification information available for your account."
        >
          <div className="flex flex-col gap-4 rounded-xl border border-[#383943] bg-[#26272B]/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#EAEAE6]">
                Verification Status
              </p>

              <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
                {emailVerified
                  ? 'Your account reports a verified email address.'
                  : 'Your account does not currently report a verified email address.'}
              </p>
            </div>

            <StatusBadge
              status={emailVerified ? 'active' : 'pending'}
              size="sm"
            />
          </div>

          {!emailVerified && (
            <div
              role="status"
              className="mt-4 rounded-xl border border-[#E5DF98]/20 bg-[#E5DF98]/5 p-4"
            >
              <p className="text-sm font-medium text-[#E5DF98]">
                Email verification may be required
              </p>

              <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
                Use the existing email verification flow where applicable.
                This page does not create a separate verification process.
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#454650]/70 bg-[#1D1F27] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#EAEAE6]">
            Return to your workspace
          </p>

          <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
            Continue managing your department and academic operations.
          </p>
        </div>

        <Link
          to="/hod/dashboard"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#EAEAE6] transition-colors hover:border-[#CDB5F7] hover:text-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          Back to Dashboard
        </Link>
      </div>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        Profile information is displayed from the authenticated user
        context. This page does not modify account details or introduce
        new backend operations.
      </p>
    </div>
  );
}