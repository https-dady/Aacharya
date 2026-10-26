import { useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import DataTable from '../../components/DataTable.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const FACULTY_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DISABLED', label: 'Disabled' },
];

const FACULTY_ROLE_OPTIONS = [
  { value: 'ALL', label: 'All roles' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'MENTOR', label: 'Mentor / TG' },
];

const FACULTY_COLUMNS = [
  {
    key: 'institutionalId',
    header: 'Institutional ID',
    accessor: 'institutionalId',
  },
  {
    key: 'fullName',
    header: 'Faculty Member',
    accessor: 'fullName',
  },
  {
    key: 'email',
    header: 'Email Address',
    accessor: 'email',
  },
  {
    key: 'role',
    header: 'Role',
    accessor: 'role',
    render: (value) => {
      const isMentor = value === 'MENTOR';

      return (
        <span
          className={[
            'inline-flex rounded-full border px-2.5 py-1',
            'text-xs font-medium',
            isMentor
              ? 'border-[#CDB5F7]/30 bg-[#CDB5F7]/10 text-[#D8C7FA]'
              : 'border-[#454650] bg-[#292A32] text-[#D0D0D8]',
          ].join(' ')}
        >
          {isMentor ? 'Mentor / TG' : 'Faculty'}
        </span>
      );
    },
  },
  {
    key: 'status',
    header: 'Account Status',
    accessor: 'status',
    render: (value) => {
      const statusStyles = {
        ACTIVE:
          'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
        SUSPENDED:
          'border-amber-500/25 bg-amber-500/10 text-amber-300',
        DISABLED:
          'border-rose-500/25 bg-rose-500/10 text-rose-300',
      };

      return (
        <span
          className={[
            'inline-flex rounded-full border px-2.5 py-1',
            'text-xs font-medium',
            statusStyles[value] ??
              'border-[#454650] bg-[#292A32] text-[#A5A6B0]',
          ].join(' ')}
        >
          {value || 'Unknown'}
        </span>
      );
    },
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (_value, faculty) => (
      <div className="flex flex-wrap gap-2">
        <Link
          to="/hod/faculty/details"
          state={{ faculty }}
          aria-label={`View details for ${faculty.fullName || 'faculty member'}`}
        >
          <ActionButton variant="secondary" size="sm">
            View
          </ActionButton>
        </Link>

        <Link
          to="/hod/faculty/edit"
          state={{ faculty }}
          aria-label={`Edit ${faculty.fullName || 'faculty member'}`}
        >
          <ActionButton size="sm">
            Edit
          </ActionButton>
        </Link>
      </div>
    ),
  },
];

function FilterSelect({
  label,
  value,
  onChange,
  options,
  name,
}) {
  return (
    <div className="min-w-0 flex-1">
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-medium text-[#A5A6B0]"
      >
        {label}
      </label>

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={[
          'min-h-11 w-full rounded-xl border border-[#454650]',
          'bg-[#1D1F27] px-3 py-2.5 text-sm text-[#EAEAE6]',
          'outline-none transition-colors',
          'focus:border-[#CDB5F7] focus:ring-2',
          'focus:ring-[#CDB5F7]/20',
        ].join(' ')}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function FacultyList() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [role, setRole] = useState('ALL');

  /*
   * Frontend-only phase:
   * No sample faculty records are fabricated.
   * Actual records will be connected during the API integration phase.
   */
  const facultyMembers = [];
  const isLoading = false;

  function resetFilters() {
    setSearch('');
    setStatus('ALL');
    setRole('ALL');
  }

  const hasActiveFilters =
    search.trim() !== '' ||
    status !== 'ALL' ||
    role !== 'ALL';

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Faculty Management"
        description="Manage faculty accounts and review departmental teaching staff."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Faculty Management' },
        ]}
        actions={
          <Link to="/hod/faculty/new">
            <ActionButton
              variant="primary"
              leadingIcon={
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path
                    d="M12 5v14M5 12h14"
                    strokeLinecap="round"
                  />
                </svg>
              }
            >
              Create Faculty
            </ActionButton>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Faculty Directory
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-1 text-xs text-[#777986]">
            Total records will appear after integration.
          </p>
        </div>

        <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Faculty Accounts
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-1 text-xs text-[#777986]">
            Account totals are not loaded yet.
          </p>
        </div>

        <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Mentor / TG
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-1 text-xs text-[#777986]">
            Role totals are not loaded yet.
          </p>
        </div>
      </div>

      <SectionCard
        eyebrow="STAFF DIRECTORY"
        title="Department faculty"
        description="Search and filter faculty accounts by institutional ID, name, email, role, or account status."
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,1.6fr)_minmax(160px,1fr)_minmax(160px,1fr)]">
            <div>
              <label
                htmlFor="faculty-search"
                className="mb-2 block text-xs font-medium text-[#A5A6B0]"
              >
                Search faculty
              </label>

              <SearchInput
                name="faculty-search"
                label="Search faculty by ID, name, or email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, ID, or email..."
              />
            </div>

            <FilterSelect
              name="faculty-role-filter"
              label="Account role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              options={FACULTY_ROLE_OPTIONS}
            />

            <FilterSelect
              name="faculty-status-filter"
              label="Account status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={FACULTY_STATUS_OPTIONS}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
            <p className="text-sm text-[#A5A6B0]">
              {facultyMembers.length} records currently loaded
            </p>

            <div className="flex flex-wrap gap-2">
              {hasActiveFilters && (
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={resetFilters}
                >
                  Clear filters
                </ActionButton>
              )}

              <Link to="/hod/faculty/new">
                <ActionButton size="sm">
                  Create faculty account
                </ActionButton>
              </Link>
            </div>
          </div>

          <DataTable
            columns={FACULTY_COLUMNS}
            data={facultyMembers}
            rowKey={(faculty) =>
              faculty.id || faculty._id || faculty.institutionalId
            }
            loading={isLoading}
            ariaLabel="Department faculty directory"
            emptyTitle={
              hasActiveFilters
                ? 'No matching faculty records'
                : 'No faculty records loaded'
            }
            emptyDescription={
              hasActiveFilters
                ? 'No records match the selected filters. Clear the filters or try another search.'
                : 'Faculty records will appear here when the frontend is connected to the department faculty API. No sample accounts are being displayed.'
            }
            emptyAction={
              hasActiveFilters ? (
                <ActionButton
                  variant="secondary"
                  onClick={resetFilters}
                >
                  Clear filters
                </ActionButton>
              ) : null
            }
          />
        </div>
      </SectionCard>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        Faculty management is restricted to the authenticated HOD's
        department. Actual records and account operations will use the
        existing backend contracts during the integration phase.
      </p>
    </div>
  );
}