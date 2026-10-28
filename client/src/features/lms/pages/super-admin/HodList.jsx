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

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function getDepartmentName(hod) {
  if (typeof hod.department === 'string') {
    return hod.department;
  }

  return (
    hod.department?.name ||
    hod.departmentName ||
    'Not available'
  );
}

function getAccountStatus(hod) {
  return typeof hod.status === 'string'
    ? hod.status
    : 'Unknown';
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Unable to load HOD accounts. Please try again.'
  );
}

export default function HodList() {
  const navigate = useNavigate();
  const location = useLocation();

  const [hods, setHods] = useState([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const notice =
    typeof location.state?.notice === 'string'
      ? location.state.notice
      : '';

  const loadHods = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const response = await api.get('/v1/provisioning/hods');

      const payload = response?.data;
      const records = payload?.data?.hods;

      if (!Array.isArray(records)) {
        throw new Error(
          'The server returned an unexpected HOD directory response.',
        );
      }

      setHods(records);
    } catch (error) {
      setHods([]);
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHods();
  }, [loadHods]);

  const departments = useMemo(() => {
    const names = hods
      .map(getDepartmentName)
      .filter((name) => name !== 'Not available');

    return [...new Set(names)].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [hods]);

  const filteredHods = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return hods.filter((hod) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          hod.fullName,
          hod.name,
          hod.email,
          hod.institutionalId,
          getDepartmentName(hod),
        ].some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(normalizedSearch),
        );

      const matchesDepartment =
        departmentFilter === 'all' ||
        getDepartmentName(hod) === departmentFilter;

      return matchesSearch && matchesDepartment;
    });
  }, [hods, search, departmentFilter]);

  function openHodDetails(hod) {
    navigate(
      `/super-admin/hods/details?id=${encodeURIComponent(hod.id || hod._id || '')}`,
      {
        state: { hod },
      },
    );
  }

  const columns = [
    {
      key: 'fullName',
      header: 'HOD account',
      accessor: (hod) =>
        hod.fullName || hod.name || 'Not available',
      render: (value, hod) => (
        <div className="min-w-0">
          <p className="font-medium text-[#EAEAE6]">
            {value}
          </p>

          <p className="mt-1 break-all text-xs text-[#92929F]">
            {hod.email || 'Email not available'}
          </p>
        </div>
      ),
    },
    {
      key: 'institutionalId',
      header: 'Institutional ID',
      accessor: (hod) => hod.institutionalId || 'Not available',
    },
    {
      key: 'department',
      header: 'Department',
      accessor: getDepartmentName,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      render: (_value, hod) => (
        <StatusBadge
          status={getAccountStatus(hod)}
          size="sm"
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, hod) => (
        <ActionButton
          variant="ghost"
          size="sm"
          leadingIcon={<EyeIcon />}
          onClick={() => openHodDetails(hod)}
          aria-label={`View details for ${hod.fullName || hod.name || 'HOD account'}`}
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
        title="HOD accounts"
        description="Manage Head of Department accounts and review their institutional information."
        breadcrumbs={[
          {
            label: 'Dashboard',
            to: '/super-admin/dashboard',
          },
          {
            label: 'HOD Accounts',
          },
        ]}
        actions={
          <ActionButton
            onClick={() => navigate('/super-admin/hods/new')}
          >
            Create HOD account
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

      {loadError && (
        <div
          role="alert"
          className="mb-6 flex flex-col gap-3 rounded-xl border border-[#B86D78]/40 bg-[#B86D78]/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm leading-6 text-[#E9A5AE]">
            {loadError}
          </p>

          <ActionButton
            variant="secondary"
            onClick={loadHods}
            disabled={isLoading}
          >
            Retry
          </ActionButton>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SectionCard
          eyebrow="ACCOUNT DIRECTORY"
          title="HOD accounts"
          description="Accounts provisioned through the institutional administration workflow."
        >
          <p className="text-3xl font-semibold tracking-tight text-[#EAEAE6]">
            {isLoading ? '—' : hods.length}
          </p>

          <p className="mt-1 text-xs text-[#92929F]">
            {isLoading
              ? 'Loading account records...'
              : 'Records available in this directory'}
          </p>
        </SectionCard>

        <SectionCard
          eyebrow="ACCOUNT PROVISIONING"
          title="Create an HOD account"
          description="Provision an HOD account for an existing department."
          variant="elevated"
        >
          <ActionButton
            variant="secondary"
            onClick={() => navigate('/super-admin/hods/new')}
          >
            Create HOD
          </ActionButton>
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="DIRECTORY"
        title="All HOD accounts"
        description="Search available records by name, email, institutional ID or department."
      >
        <div className="mb-5 flex flex-col gap-3 lg:flex-row">
          <div className="min-w-0 flex-1">
            <SearchInput
              name="hod-search"
              label="Search HOD accounts"
              placeholder="Search by name, email, ID or department..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="w-full lg:w-64">
            <label
              htmlFor="hod-department-filter"
              className="mb-2 block text-xs font-medium text-[#A5A6B0]"
            >
              Filter by department
            </label>

            <select
              id="hod-department-filter"
              value={departmentFilter}
              onChange={(event) =>
                setDepartmentFilter(event.target.value)
              }
              disabled={isLoading || departments.length === 0}
              className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="all">All departments</option>

              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 rounded-xl border border-[#343640] bg-[#1D1F27] p-6"
          >
            <span
              aria-hidden="true"
              className="h-5 w-5 animate-spin rounded-full border-2 border-[#CDB5F7]/30 border-t-[#CDB5F7]"
            />

            <p className="text-sm text-[#A5A6B0]">
              Loading HOD accounts...
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredHods}
            rowKey={(hod) => hod.id || hod._id || hod.email}
            ariaLabel="HOD account directory"
            emptyTitle={
              loadError
                ? 'Unable to load HOD directory'
                : hods.length === 0
                  ? 'No HOD accounts found'
                  : 'No matching HOD accounts'
            }
            emptyDescription={
              loadError
                ? 'Retry loading the directory after checking the server connection.'
                : hods.length === 0
                  ? 'No HOD accounts are currently available. Create an HOD account for an existing department to populate this directory.'
                  : 'No HOD accounts match the current search and department filter.'
            }
            emptyAction={
              loadError ? (
                <ActionButton
                  variant="secondary"
                  onClick={loadHods}
                >
                  Retry
                </ActionButton>
              ) : hods.length === 0 ? (
                <ActionButton
                  onClick={() => navigate('/super-admin/hods/new')}
                >
                  Create HOD account
                </ActionButton>
              ) : null
            }
            minWidth="760px"
          />
        )}
      </SectionCard>
    </div>
  );
}