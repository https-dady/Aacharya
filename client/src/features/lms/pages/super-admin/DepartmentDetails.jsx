import { Link, useLocation } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

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

function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M19 12H5m7-7-7 7 7 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 11v5m0-8h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
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

function getHodName(hod) {
  if (!hod) {
    return 'Not assigned';
  }

  if (typeof hod === 'string') {
    return hod;
  }

  return hod.fullName || hod.name || hod.email || 'Not assigned';
}

function DetailField({ label, children }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#383943] bg-[#26272B]/60 p-4">
      <p className="text-xs font-medium text-[#92929F]">
        {label}
      </p>

      <div className="mt-2 break-words text-sm font-medium leading-6 text-[#EAEAE6]">
        {children || 'Not available'}
      </div>
    </div>
  );
}

export default function DepartmentDetails() {
  const location = useLocation();

  /*
   * Department data must be supplied by a real navigation source.
   * The current backend does not expose a department details GET endpoint.
   */
  const department = location.state?.department ?? null;

  if (!department) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="SUPER ADMINISTRATION"
          title="Department details"
          description="Review academic department information and its administrative assignment."
          breadcrumbs={[
            {
              label: 'Dashboard',
              to: '/super-admin/dashboard',
            },
            {
              label: 'Departments',
              to: '/super-admin/departments',
            },
            {
              label: 'Department details',
            },
          ]}
        />

        <EmptyState
          icon={<BuildingIcon className="h-7 w-7" />}
          title="Department information unavailable"
          description="No department record was provided to this page. The current backend does not provide a department-details endpoint, so the record cannot be loaded directly."
          action={
            <Link
              to="/super-admin/departments"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#CDB5F7] bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14161C]"
            >
              <ArrowLeftIcon />
              Back to departments
            </Link>
          }
        />

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#454650]/70 bg-[#1D1F27] p-4">
          <span className="mt-0.5 shrink-0 text-[#E5DF98]">
            <InfoIcon />
          </span>

          <div>
            <p className="text-sm font-medium text-[#EAEAE6]">
              Details integration pending
            </p>

            <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
              A supported details endpoint and department identifier
              are required before this page can load records directly.
              No sample department information is displayed as real data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const departmentName = department.name || 'Unnamed department';

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="SUPER ADMINISTRATION"
        title={departmentName}
        description="Department information and administrative assignment."
        breadcrumbs={[
          {
            label: 'Dashboard',
            to: '/super-admin/dashboard',
          },
          {
            label: 'Departments',
            to: '/super-admin/departments',
          },
          {
            label: departmentName,
          },
        ]}
        actions={
          <StatusBadge
            status={department.status}
          />
        }
      />

      <div className="mb-6">
        <Link
          to="/super-admin/departments"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-[#A5A6B0] transition-colors hover:text-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          <ArrowLeftIcon />
          Back to departments
        </Link>
      </div>

      <section
        aria-label="Department overview"
        className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]">
              <BuildingIcon className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium text-[#A5A6B0]">
                Department code
              </p>

              <p className="mt-2 break-all font-mono text-xl font-semibold tracking-wide text-[#EAEAE6]">
                {department.code || 'Not available'}
              </p>

              <p className="mt-2 text-xs leading-5 text-[#92929F]">
                Institutional identifier for this department.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 sm:p-6">
          <p className="text-xs font-medium text-[#A5A6B0]">
            Department status
          </p>

          <div className="mt-3">
            <StatusBadge status={department.status} />
          </div>

          <p className="mt-3 text-xs leading-5 text-[#92929F]">
            Current status as supplied by the department record.
          </p>
        </div>
      </section>

      <SectionCard
        eyebrow="DEPARTMENT RECORD"
        title="Department information"
        description="Review the available information associated with this academic department."
        icon={<BuildingIcon />}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailField label="Department name">
            {department.name}
          </DetailField>

          <DetailField label="Department code">
            {department.code}
          </DetailField>

          <DetailField label="Head of Department">
            {getHodName(department.hod)}
          </DetailField>

          <DetailField label="Created on">
            {formatDate(department.createdAt)}
          </DetailField>

          <div className="md:col-span-2">
            <DetailField label="Description">
              {department.description || 'No description provided.'}
            </DetailField>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="ADMINISTRATIVE ASSIGNMENT"
        title="Head of Department"
        description="Review the HOD assignment associated with this department."
        icon={<InfoIcon />}
        className="mt-6"
      >
        {department.hod ? (
          <div className="rounded-xl border border-[#383943] bg-[#26272B]/60 p-4">
            <p className="text-sm font-semibold text-[#EAEAE6]">
              {getHodName(department.hod)}
            </p>

            {department.hod.email && (
              <p className="mt-2 break-all text-sm text-[#A5A6B0]">
                {department.hod.email}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#454650] bg-[#26272B]/40 p-5">
            <p className="text-sm font-medium text-[#EAEAE6]">
              No HOD assigned
            </p>

            <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
              This department record does not contain an HOD assignment.
              HOD provisioning is managed separately.
            </p>
          </div>
        )}
      </SectionCard>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#454650]/70 bg-[#1D1F27] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#EAEAE6]">
            Department record
          </p>

          <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
            This page currently displays supplied information only.
            Saving edits requires a supported backend update operation.
          </p>
        </div>

        <ActionButton
          variant="secondary"
          onClick={() => window.history.back()}
        >
          Go back
        </ActionButton>
      </div>
    </div>
  );
}