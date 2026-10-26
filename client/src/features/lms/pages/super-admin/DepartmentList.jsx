import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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

function DepartmentList() {
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  /*
   * The current backend does not expose a department listing endpoint.
   * Keep this empty until a supported GET endpoint is available.
   * Do not insert fake department records.
   */
  const departments = [];

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
    },
    {
      key: 'hod',
      header: 'Head of Department',
      accessor: (department) =>
        department.hod?.fullName ||
        department.hod?.name ||
        'Not assigned',
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
            navigate('/super-admin/departments/details', {
              state: { department },
            })
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
          <ActionButton
            onClick={() =>
              navigate('/super-admin/departments/new')
            }
          >
            Create department
          </ActionButton>
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

          <p className="min-w-0 flex-1 leading-6">
            {notice}
          </p>

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

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SectionCard
          eyebrow="DIRECTORY"
          title="Department records"
          description="Departments available in the directory."
        >
          <p className="text-3xl font-semibold tracking-tight text-[#EAEAE6]">
            {departments.length}
          </p>

          <p className="mt-1 text-xs text-[#92929F]">
            Records currently available to this page
          </p>
        </SectionCard>

        <SectionCard
          eyebrow="INSTITUTION SETUP"
          title="Add a department"
          description="Register a department using the supported creation workflow."
          variant="elevated"
        >
          <ActionButton
            variant="secondary"
            onClick={() =>
              navigate('/super-admin/departments/new')
            }
          >
            Create department
          </ActionButton>
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="DIRECTORY"
        title="All departments"
        description="Search available departments by name or code and filter by status."
      >
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <SearchInput
              name="department-search"
              label="Search departments"
              placeholder="Search by department name or code..."
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

        <DataTable
          columns={columns}
          data={filteredDepartments}
          rowKey={(department) =>
            department.id || department._id || department.code
          }
          ariaLabel="Department directory"
          emptyTitle="Department directory is not connected yet"
          emptyDescription="The current backend supports creating departments but does not expose a department listing endpoint. Newly created departments cannot appear in this directory until that endpoint is available."
          emptyAction={
            <ActionButton
              onClick={() =>
                navigate('/super-admin/departments/new')
              }
            >
              Create department
            </ActionButton>
          }
          minWidth="760px"
        />
      </SectionCard>
    </div>
  );
}

export default DepartmentList;