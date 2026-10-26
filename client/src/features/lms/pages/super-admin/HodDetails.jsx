import { Link, useLocation } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function DetailIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <circle
        cx="12"
        cy="8"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4.5 20a7.5 7.5 0 0 1 15 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InformationRow({ label, value }) {
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

function getInitials(name) {
  if (!name || typeof name !== 'string') {
    return 'H';
  }

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatRole(role) {
  if (!role || typeof role !== 'string') {
    return 'Not available';
  }

  return role
    .toLowerCase()
    .split('_')
    .map(
      (part) => part.charAt(0).toUpperCase() + part.slice(1),
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

export default function HodDetails() {
  const location = useLocation();

  const hod = location.state?.hod ?? null;

  if (!hod) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="ACCOUNT MANAGEMENT"
          title="HOD account details"
          description="Review information associated with a department HOD account."
          breadcrumbs={[
            {
              label: 'Dashboard',
              to: '/super-admin/dashboard',
            },
            {
              label: 'HOD Accounts',
              to: '/super-admin/hods',
            },
            {
              label: 'Account details',
            },
          ]}
        />

        <SectionCard>
          <EmptyState
            title="No HOD account selected"
            description="Open this page from a selected HOD account to review its available information. A server-backed HOD details endpoint is not currently available."
            action={
              <Link
                to="/super-admin/hods"
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#CDB5F7] px-4 py-2 text-sm font-semibold text-[#17151D] transition-colors hover:bg-[#D9C8FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D1F27]"
              >
                Back to HOD accounts
              </Link>
            }
          />
        </SectionCard>
      </div>
    );
  }

  const fullName = hod.fullName || hod.name || 'HOD account';

  const departmentName =
    typeof hod.department === 'string'
      ? hod.department
      : hod.department?.name || hod.departmentName;

  const emailVerified = hod.isEmailVerified === true;

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="ACCOUNT MANAGEMENT"
        title="HOD account details"
        description="Review the available identity, department and verification information for this account."
        breadcrumbs={[
          {
            label: 'Dashboard',
            to: '/super-admin/dashboard',
          },
          {
            label: 'HOD Accounts',
            to: '/super-admin/hods',
          },
          {
            label: 'Account details',
          },
        ]}
      />

      <section
        aria-label="HOD account overview"
        className="mb-6 overflow-hidden rounded-2xl border border-[#343640] bg-[#1D1F27]"
      >
        <div className="h-1.5 bg-gradient-to-r from-[#CDB5F7] via-[#A997D9] to-[#E5DF98]" />

        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#CDB5F7]/30 bg-[#CDB5F7]/10 text-2xl font-semibold text-[#CDB5F7]">
            {getInitials(fullName)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#92929F]">
              Department account
            </p>

            <h2 className="mt-2 break-words text-2xl font-semibold tracking-tight text-[#EAEAE6]">
              {fullName}
            </h2>

            <p className="mt-1 break-all text-sm text-[#A5A6B0]">
              {hod.email || 'Email not available'}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-3 py-1 text-xs font-medium text-[#CDB5F7]">
                {formatRole(hod.role || 'HOD')}
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
        eyebrow="ACCOUNT INFORMATION"
        title="Identity details"
        description="Account information available from the selected HOD record."
        icon={<DetailIcon />}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InformationRow
            label="Full name"
            value={hod.fullName || hod.name}
          />

          <InformationRow
            label="Institutional ID"
            value={hod.institutionalId}
          />

          <InformationRow
            label="Email address"
            value={hod.email}
          />

          <InformationRow
            label="Account role"
            value={formatRole(hod.role || 'HOD')}
          />

          <InformationRow
            label="Department"
            value={departmentName}
          />

          <InformationRow
            label="Account created"
            value={formatDate(hod.createdAt)}
          />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="VERIFICATION"
        title="Email status"
        description="Verification status reported by the selected account record."
        className="mt-6"
      >
        <div className="flex flex-col gap-3 rounded-xl border border-[#383943] bg-[#26272B]/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#EAEAE6]">
              Email verification
            </p>

            <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
              {emailVerified
                ? 'The account record reports that the email is verified.'
                : 'The account record does not report a verified email address.'}
            </p>
          </div>

          <StatusBadge
            status={emailVerified ? 'active' : 'pending'}
            size="sm"
          />
        </div>
      </SectionCard>

      <div className="mt-6">
        <Link
          to="/super-admin/hods"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#EAEAE6] transition-colors hover:border-[#CDB5F7] hover:text-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          Back to HOD accounts
        </Link>
      </div>
    </div>
  );
}