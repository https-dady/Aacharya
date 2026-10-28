import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import DataTable from '../../components/DataTable.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

function SuccessIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d="m5 12 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function normalizeDepartment(department) {
  return {
    id: String(department.id ?? department._id ?? ''),
    name: department.name ?? '',
    code: department.code ?? '',
    description: department.description ?? '',
    status: String(department.status ?? 'unknown').toLowerCase(),
    hod: department.hod
      ? {
        id: String(department.hod.id ?? department.hod._id ?? ''),
        fullName:
          department.hod.fullName ??
          department.hod.name ??
          '',
        institutionalId: department.hod.institutionalId ?? '',
        email: department.hod.email ?? '',
        status: department.hod.status ?? '',
      }
      : null,
    createdAt: department.createdAt ?? null,
    updatedAt: department.updatedAt ?? null,
  };
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Unable to load departments. Please try again.'
  );
}

function DepartmentList() {
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadDepartments = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const response = await api.get('/v1/departments');
      const body = response?.data;

      if (!body?.success || !Array.isArray(body.data)) {
        throw new Error(
          'The server returned an invalid department directory response.',
        );
      }

      setDepartments(body.data.map(normalizeDepartment));
    } catch (error) {
      setDepartments([]);
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const notice =
    typeof location.state?.notice === 'string'
      ? location.state.notice
      : '';

  const filteredDepartments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return departments.filter((department) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          department.name,
          department.code,
          department.description,
          department.hod?.fullName,
        ].some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(normalizedSearch),
        );

      const normalizedStatus = String(
        department.status ?? '',
      ).toLowerCase();

      const matchesStatus =
        statusFilter === 'all' ||
        normalizedStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [departments, search, statusFilter]);

  const activeDepartmentCount = departments.filter(
    (department) => department.status === 'active',
  ).length;

  const inactiveDepartmentCount = departments.filter(
    (department) => department.status === 'inactive',
  ).length;

  const columns = [
    {
      key: 'name',
      header: 'Department',
      accessor: 'name',
      render: (value, department) => (
        <div className="min-w-0">
          <p className="font-medium text-[#EAEAE6]">
            {value || 'Unnamed department'}
          </p>

          <p className="mt-1 break-words text-xs text-[#92929F]">
            {department.description || 'No description provided'}
          </p>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Department code',
      accessor: 'code',
      render: (value) => (
        <span className="font-mono text-sm text-[#CDB5F7]">
          {value || '—'}
        </span>
      ),
    },
    {
      key: 'hod',
      header: 'Head of Department',
      accessor: (department) =>
        department.hod?.fullName || 'Not assigned',
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      render: (value) => (
        <StatusBadge status={value} size="sm" />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, department) => (
        <ActionButton
          variant="ghost"
          size="sm"
          onClick={() =>
            navigate(
              `/super-admin/departments/details?id=${encodeURIComponent(
                department.id,
              )}`,
              {
                state: { department },
              },
            )
          }
        >
          View details
        </ActionButton>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="SUPER ADMINISTRATION"
        title="Departments"
        description="Manage institutional departments and their administrative information."
        breadcrumbs={[
          {
            label: 'Dashboard',
            to: '/super-admin/dashboard',
          },
          {
            label: 'Departments',
          },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <ActionButton
              variant="secondary"
              onClick={loadDepartments}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </ActionButton>

            <ActionButton
              onClick={() =>
                navigate('/super-admin/departments/new')
              }
            >
              Create department
            </ActionButton>
          </div>
        }
      />

      {notice && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-xl border border-[#5A8C78]/40 bg-[#5A8C78]/10 p-4 text-sm text-[#A6D8C1]"
        >
          <span className="mt-0.5 shrink-0">
            <SuccessIcon />
          </span>

          <p className="min-w-0 flex-1 leading-6">{notice}</p>

          <button
            type="button"
            aria-label="Dismiss success message"
            onClick={() => {
              navigate(location.pathname, {
                replace: true,
                state: null,
              });
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-[#A6D8C1] hover:bg-[#5A8C78]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Dismiss
          </button>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-400/30 bg-red-400/5 p-4"
        >
          <p className="text-sm leading-6 text-red-300">
            {loadError}
          </p>

          <div className="mt-3">
            <ActionButton
              variant="secondary"
              onClick={loadDepartments}
              disabled={isLoading}
            >
              Try again
            </ActionButton>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SectionCard
          eyebrow="DIRECTORY"
          title="Total departments"
          description="All department records returned by the server."
        >
          <p className="text-3xl font-semibold tracking-tight text-[#EAEAE6]">
            {isLoading ? '—' : departments.length}
          </p>

          <p className="mt-1 text-xs text-[#92929F]">
            {isLoading
              ? 'Loading records...'
              : 'Total registered departments'}
          </p>
        </SectionCard>

        <SectionCard
          eyebrow="ACTIVE"
          title="Active departments"
          description="Departments currently marked active."
        >
          <p className="text-3xl font-semibold tracking-tight text-[#A6D8C1]">
            {isLoading ? '—' : activeDepartmentCount}
          </p>
        </SectionCard>

        <SectionCard
          eyebrow="INACTIVE"
          title="Inactive departments"
          description="Departments currently marked inactive."
        >
          <p className="text-3xl font-semibold tracking-tight text-[#E5DF98]">
            {isLoading ? '—' : inactiveDepartmentCount}
          </p>
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="DIRECTORY"
        title="All departments"
        description="Search departments by name, code or HOD and filter by status."
      >
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <SearchInput
              name="department-search"
              label="Search departments"
              placeholder="Search by department name, code or HOD..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="w-full md:w-56">
            <label
              htmlFor="department-status-filter"
              className="mb-2 block text-xs font-medium text-[#A5A6B0]"
            >
              Filter by status
            </label>

            <select
              id="department-status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-[#343640] bg-[#26272B] p-8 text-center"
          >
            <p className="text-sm text-[#A5A6B0]">
              Loading departments from the server...
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredDepartments}
            rowKey={(department) =>
              department.id || department.code
            }
            ariaLabel="Department directory"
            emptyTitle={
              loadError
                ? 'Department directory unavailable'
                : departments.length === 0
                  ? 'No departments found'
                  : 'No matching departments'
            }
            emptyDescription={
              loadError
                ? 'The department directory could not be loaded. Retry the request or check the server connection.'
                : departments.length === 0
                  ? 'No department records are currently available. Create a department to get started.'
                  : 'No departments match the current search and status filters.'
            }
            emptyAction={
              loadError ? (
                <ActionButton
                  onClick={loadDepartments}
                  disabled={isLoading}
                >
                  Try again
                </ActionButton>
              ) : departments.length === 0 ? (
                <ActionButton
                  onClick={() =>
                    navigate('/super-admin/departments/new')
                  }
                >
                  Create department
                </ActionButton>
              ) : (
                <ActionButton
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                >
                  Clear filters
                </ActionButton>
              )
            }
            minWidth="760px"
          />
        )}
      </SectionCard>
    </div>
  );
}

export default DepartmentList;