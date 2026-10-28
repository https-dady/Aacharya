import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

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

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message
    || error?.message
    || fallback
  );
}

function getHodId(hod) {
  if (!hod) {
    return '';
  }

  if (typeof hod === 'string') {
    return hod;
  }

  return hod._id || hod.id || '';
}

function getHodName(hod) {
  if (!hod) {
    return 'Not assigned';
  }

  if (typeof hod === 'string') {
    return hod;
  }

  return hod.fullName || hod.name || hod.email || 'HOD account';
}

function getHodEmail(hod) {
  if (!hod || typeof hod === 'string') {
    return '';
  }

  return hod.email || '';
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

function getResponseData(response) {
  const body = response?.data;

  return body?.data ?? body;
}

function getHodCollection(response) {
  const data = getResponseData(response);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.hods)) {
    return data.hods;
  }

  if (Array.isArray(data?.users)) {
    return data.users;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

export default function DepartmentDetails() {
  const [searchParams] = useSearchParams();

  const departmentId = searchParams.get('id') || '';

  const [department, setDepartment] = useState(null);
  const [hods, setHods] = useState([]);
  const [selectedHodId, setSelectedHodId] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHods, setIsLoadingHods] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pageError, setPageError] = useState('');
  const [hodListError, setHodListError] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDepartment = useCallback(async () => {
    if (!departmentId) {
      setDepartment(null);
      setPageError(
        'Department ID is missing. Return to the department directory and select a department.',
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPageError('');

    try {
      const response = await api.get(
        `/v1/departments/${encodeURIComponent(departmentId)}`,
      );

      const data = getResponseData(response);
      const record = data?.department ?? data;

      if (
        !record
        || typeof record !== 'object'
        || !(record._id || record.id)
      ) {
        throw new Error(
          'The server did not return a valid department record.',
        );
      }

      setDepartment(record);
      setSelectedHodId(getHodId(record.hod));
    } catch (error) {
      setDepartment(null);
      setPageError(
        getErrorMessage(
          error,
          'Unable to load department details.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [departmentId]);

  const loadHods = useCallback(async () => {
    setIsLoadingHods(true);
    setHodListError('');

    try {
      const response = await api.get('/v1/provisioning/hods');
      const records = getHodCollection(response);

      setHods(records.filter((hod) => (
        (hod._id || hod.id)
        && hod.role === 'HOD'
        && hod.status === 'ACTIVE'
      )));
    } catch (error) {
      setHods([]);
      setHodListError(
        getErrorMessage(
          error,
          'Unable to load available HOD accounts.',
        ),
      );
    } finally {
      setIsLoadingHods(false);
    }
  }, []);

  useEffect(() => {
    loadDepartment();
  }, [loadDepartment]);

  useEffect(() => {
    loadHods();
  }, [loadHods]);

  const currentHodId = getHodId(department?.hod);

  const hasAssignmentChanges = selectedHodId !== currentHodId;

  async function handleAssignmentSubmit(event) {
    event.preventDefault();

    if (!departmentId || !department) {
      return;
    }

    if (!hasAssignmentChanges || isSubmitting) {
      return;
    }

    setAssignmentError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      await api.patch(
        `/v1/departments/${encodeURIComponent(departmentId)}/hod`,
        {
          hodId: selectedHodId || null,
        },
      );

      setNotice(
        selectedHodId
          ? 'Department HOD assignment updated successfully.'
          : 'HOD assignment removed successfully.',
      );

      await Promise.all([
        loadDepartment(),
        loadHods(),
      ]);
    } catch (error) {
      setAssignmentError(
        getErrorMessage(
          error,
          'Unable to update the HOD assignment. Please try again.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveAssignment() {
    if (!departmentId || !currentHodId || isSubmitting) {
      return;
    }

    const confirmed = window.confirm(
      'Remove the current HOD assignment from this department? '
      + 'The department and HOD account will not be deleted.',
    );

    if (!confirmed) {
      return;
    }

    setSelectedHodId('');
    setAssignmentError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      await api.patch(
        `/v1/departments/${encodeURIComponent(departmentId)}/hod`,
        {
          hodId: null,
        },
      );

      setNotice('HOD assignment removed successfully.');

      await Promise.all([
        loadDepartment(),
        loadHods(),
      ]);
    } catch (error) {
      setSelectedHodId(currentHodId);

      setAssignmentError(
        getErrorMessage(
          error,
          'Unable to remove the HOD assignment. Please try again.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="SUPER ADMINISTRATION"
          title="Department details"
          description="Loading department information and administrative assignment."
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

        <div
          role="status"
          className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-6 text-sm text-[#A5A6B0]"
        >
          Loading department details…
        </div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="SUPER ADMINISTRATION"
          title="Department details"
          description="Review department information and manage its HOD assignment."
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

        <SectionCard>
          <EmptyState
            icon={<BuildingIcon className="h-7 w-7" />}
            title="Department details unavailable"
            description={pageError || 'The requested department could not be loaded.'}
            action={
              <Link
                to="/super-admin/departments"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#CDB5F7] bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                <ArrowLeftIcon />
                Back to departments
              </Link>
            }
          />
        </SectionCard>

        {departmentId && (
          <div className="mt-4">
            <ActionButton
              variant="secondary"
              onClick={loadDepartment}
            >
              Retry loading
            </ActionButton>
          </div>
        )}
      </div>
    );
  }

  const departmentName = department.name || 'Unnamed department';

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="SUPER ADMINISTRATION"
        title={departmentName}
        description="Review department information and manage its administrative HOD assignment."
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
        actions={<StatusBadge status={department.status} />}
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

      {notice && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-[#5A8C78]/40 bg-[#5A8C78]/10 px-4 py-3 text-sm leading-6 text-[#A6D8C1]"
        >
          {notice}
        </div>
      )}

      {pageError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-[#B86D78]/40 bg-[#B86D78]/10 px-4 py-3 text-sm leading-6 text-[#E9A5AE]"
        >
          {pageError}
          <button
            type="button"
            onClick={loadDepartment}
            className="ml-3 font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

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
            Current status reported by the department record.
          </p>
        </div>
      </section>

      <SectionCard
        eyebrow="DEPARTMENT RECORD"
        title="Department information"
        description="Review the official information associated with this academic department."
        icon={<BuildingIcon />}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailField label="Department name">
            {department.name}
          </DetailField>

          <DetailField label="Department code">
            {department.code}
          </DetailField>

          <DetailField label="Department status">
            {department.status}
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
        description="Assign an active HOD, replace the current HOD, transfer an HOD from another department, or remove the assignment. Department and HOD accounts will not be deleted."
        icon={<BuildingIcon />}
        className="mt-6"
      >
        <div className="mb-5 rounded-xl border border-[#383943] bg-[#26272B]/60 p-4">
          <p className="text-xs font-medium text-[#92929F]">
            Currently assigned HOD
          </p>

          <p className="mt-2 break-words text-sm font-semibold text-[#EAEAE6]">
            {getHodName(department.hod)}
          </p>

          {getHodEmail(department.hod) && (
            <p className="mt-1 break-all text-sm text-[#A5A6B0]">
              {getHodEmail(department.hod)}
            </p>
          )}
        </div>

        {assignmentError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-[#B86D78]/40 bg-[#B86D78]/10 px-4 py-3 text-sm leading-6 text-[#E9A5AE]"
          >
            {assignmentError}
          </div>
        )}

        {hodListError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-[#B86D78]/40 bg-[#B86D78]/10 px-4 py-3 text-sm leading-6 text-[#E9A5AE]"
          >
            <p>{hodListError}</p>

            <button
              type="button"
              onClick={loadHods}
              className="mt-2 font-semibold underline underline-offset-2"
            >
              Retry loading HOD accounts
            </button>
          </div>
        )}

        <form
          onSubmit={handleAssignmentSubmit}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="department-hod"
              className="mb-2 block text-sm font-medium text-[#EAEAE6]"
            >
              Select HOD
            </label>

            <select
              id="department-hod"
              value={selectedHodId}
              onChange={(event) => {
                setSelectedHodId(event.target.value);
                setAssignmentError('');
                setNotice('');
              }}
              disabled={
                isLoadingHods
                || isSubmitting
                || Boolean(hodListError)
                || department.status !== 'ACTIVE'
              }
              className="min-h-12 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                No HOD assigned
              </option>

              {hods.map((hod) => {
                const id = hod._id || hod.id;
                const departmentValue = hod.department;
                const assignedDepartmentId =
                  typeof departmentValue === 'string'
                    ? departmentValue
                    : departmentValue?._id || departmentValue?.id || '';

                const assignedDepartmentName =
                  typeof departmentValue === 'object'
                    ? departmentValue?.name
                    : '';

                const isAssignedElsewhere =
                  assignedDepartmentId
                  && assignedDepartmentId !== departmentId;

                const isCurrentHod = id === currentHodId;

                return (
                  <option
                    key={id}
                    value={id}
                    disabled={Boolean(isAssignedElsewhere)}
                  >
                    {getHodName(hod)}
                    {hod.email ? ` — ${hod.email}` : ''}
                    {isCurrentHod
                      ? ' (Currently assigned)'
                      : isAssignedElsewhere
                        ? ` (Assigned to ${assignedDepartmentName || 'another department'})`
                        : ''}
                  </option>
                );
              })}
            </select>

            <p className="mt-2 text-xs leading-5 text-[#92929F]">
              Only active HOD accounts are listed. An HOD already assigned
              to another department is disabled here; transfer them by
              managing the assignment on their current department first.
            </p>
          </div>

          {department.status !== 'ACTIVE' && (
            <p className="text-sm leading-6 text-[#E5DF98]">
              HOD assignments cannot be changed while this department is inactive.
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-[#383943] pt-5 sm:flex-row sm:flex-wrap sm:justify-end">
            <ActionButton
              type="button"
              variant="secondary"
              disabled={isSubmitting || !currentHodId}
              onClick={handleRemoveAssignment}
            >
              Remove assignment
            </ActionButton>

            <ActionButton
              type="button"
              variant="secondary"
              disabled={
                isSubmitting
                || isLoadingHods
                || Boolean(hodListError)
                || selectedHodId === currentHodId
              }
              onClick={() => {
                setSelectedHodId(currentHodId);
                setAssignmentError('');
                setNotice('');
              }}
            >
              Reset
            </ActionButton>

            <ActionButton
              type="submit"
              loading={isSubmitting}
              disabled={
                isSubmitting
                || isLoadingHods
                || Boolean(hodListError)
                || !hasAssignmentChanges
                || department.status !== 'ACTIVE'
              }
            >
              Save HOD assignment
            </ActionButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}