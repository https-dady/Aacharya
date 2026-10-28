import { useCallback, useEffect, useState } from 'react';
import {
  Link,
  useLocation,
  useSearchParams,
} from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

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

function BuildingIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M3.75 20.25h16.5M5.25 20.25V7.5L12 3.75l6.75 3.75v12.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 10.5h.01M15 10.5h.01M9 14.25h.01M15 14.25h.01M10 20.25v-3.75h4v3.75"
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

function getDepartmentId(hod) {
  const department = hod?.department;

  if (typeof department === 'string') {
    return department;
  }

  return department?._id || department?.id || '';
}

function getDepartmentName(hod) {
  const department = hod?.department;

  if (typeof department === 'string') {
    return department;
  }

  return (
    department?.name
    || hod?.departmentName
    || 'Not assigned'
  );
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message
    || error?.message
    || fallback
  );
}

export default function HodDetails() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const queryHodId = searchParams.get('id')?.trim() || '';
  const stateHod = location.state?.hod ?? null;

  const stateHodId = String(
    stateHod?.id ?? stateHod?._id ?? '',
  );

  const hodId = queryHodId || stateHodId;

  const [hod, setHod] = useState(
    queryHodId && stateHodId && queryHodId !== stateHodId
      ? null
      : stateHod,
  );

  const [loading, setLoading] = useState(Boolean(hodId));
  const [error, setError] = useState('');

  const loadHodDetails = useCallback(async () => {
    if (!hodId) {
      setHod(null);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.get(
        `/v1/provisioning/hods/${encodeURIComponent(hodId)}`,
      );

      const fetchedHod = response?.data?.data?.hod;

      if (!fetchedHod) {
        throw new Error(
          'The server did not return the requested HOD account.',
        );
      }

      setHod(fetchedHod);
    } catch (requestError) {
      setHod(null);
      setError(
        getErrorMessage(
          requestError,
          'Unable to load HOD account details. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [hodId]);

  useEffect(() => {
    loadHodDetails();
  }, [loadHodDetails]);

  const fullName = hod?.fullName || hod?.name || 'HOD account';
  const departmentName = getDepartmentName(hod);
  const departmentId = getDepartmentId(hod);
  const departmentCode =
    typeof hod?.department === 'object'
      ? hod.department?.code
      : undefined;

  const emailVerified = hod?.isEmailVerified === true;

  const breadcrumbs = [
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
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="ACCOUNT MANAGEMENT"
        title="HOD account details"
        description="Review the identity, department assignment and verification information for a Head of Department account."
        breadcrumbs={breadcrumbs}
      />

      {loading && (
        <SectionCard
          title="Loading HOD account"
          description="Retrieving the latest account information from the server."
        >
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 py-4 text-sm text-[#A5A6B0]"
          >
            <span
              aria-hidden="true"
              className="h-5 w-5 animate-spin rounded-full border-2 border-[#CDB5F7] border-r-transparent motion-reduce:animate-none"
            />
            Loading account details...
          </div>
        </SectionCard>
      )}

      {!loading && !hodId && (
        <SectionCard>
          <EmptyState
            title="No HOD account selected"
            description="Select an HOD from the account directory to view their details."
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
      )}

      {!loading && hodId && error && (
        <SectionCard
          title="Unable to load HOD details"
          description={error}
        >
          <div className="flex flex-wrap gap-3">
            <ActionButton onClick={loadHodDetails}>
              Retry
            </ActionButton>

            <ActionButton
              variant="secondary"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.assign('/super-admin/hods');
                }
              }}
            >
              Go back
            </ActionButton>
          </div>
        </SectionCard>
      )}

      {!loading && !error && hod && (
        <>
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
                    status={hod.status || 'unknown'}
                    size="sm"
                  />

                  <StatusBadge
                    status={emailVerified ? 'active' : 'pending'}
                    label={emailVerified ? 'Email verified' : 'Email unverified'}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </section>

          <SectionCard
            eyebrow="ACCOUNT INFORMATION"
            title="Identity details"
            description="Account information retrieved from the HOD record."
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
                label="Account created"
                value={formatDate(hod.createdAt)}
              />

              <InformationRow
                label="Last updated"
                value={formatDate(hod.updatedAt)}
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="ADMINISTRATIVE ASSIGNMENT"
            title="Department assignment"
            description="This section reflects the department currently linked to this HOD account."
            icon={<BuildingIcon />}
            className="mt-6"
          >
            {departmentId ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InformationRow
                    label="Assigned department"
                    value={departmentName}
                  />

                  <InformationRow
                    label="Department code"
                    value={departmentCode}
                  />
                </div>

                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#383943] bg-[#26272B]/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#EAEAE6]">
                      Current assignment
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
                      To transfer or remove this HOD, manage the assignment
                      from the department details page.
                    </p>
                  </div>

                  <Link
                    to={`/super-admin/departments/details?id=${encodeURIComponent(departmentId)}`}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-[#CDB5F7] px-4 py-2 text-sm font-semibold text-[#17151D] transition-colors hover:bg-[#D9C8FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                  >
                    View department
                  </Link>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-[#E5DF98]/20 bg-[#E5DF98]/5 p-5">
                <p className="text-sm font-semibold text-[#E5DF98]">
                  No department assigned
                </p>

                <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
                  This HOD account is not currently linked to a department.
                  You can assign the account from the relevant department's
                  details page.
                </p>

                <Link
                  to="/super-admin/departments"
                  className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#EAEAE6] transition-colors hover:border-[#CDB5F7] hover:text-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                >
                  Browse departments
                </Link>
              </div>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="VERIFICATION"
            title="Email status"
            description="Verification status reported by the server."
            className="mt-6"
          >
            <div className="flex flex-col gap-3 rounded-xl border border-[#383943] bg-[#26272B]/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#EAEAE6]">
                  Email verification
                </p>

                <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
                  {emailVerified
                    ? 'The account email is verified.'
                    : 'The account email has not been verified.'}
                </p>
              </div>

              <StatusBadge
                status={emailVerified ? 'active' : 'pending'}
                label={emailVerified ? 'Verified' : 'Pending'}
                size="sm"
              />
            </div>
          </SectionCard>
        </>
      )}

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