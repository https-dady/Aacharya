import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import facultyManagementService, {
  FACULTY_STATUSES,
} from '../../services/facultyManagementService.js';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Active',
    className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  },

  SUSPENDED: {
    label: 'Suspended',
    className: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  },

  DISABLED: {
    label: 'Disabled',
    className: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  },
};

const ACTION_CONFIG = {
  ACTIVE: {
    label: 'Activate',
    description:
      'The faculty member will regain LMS access and must sign in again.',
    variant: 'primary',
  },

  SUSPENDED: {
    label: 'Suspend',
    description:
      'The faculty member will lose access to the LMS and existing sessions will be revoked.',
    variant: 'secondary',
  },

  DISABLED: {
    label: 'Disable',
    description:
      'The faculty account will be disabled and existing sessions will be revoked.',
    variant: 'danger',
  },
};

function DetailField({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {value || 'Not available'}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={[
        'inline-flex rounded-full border px-3 py-1.5',
        'text-xs font-semibold',
        config?.className
          || 'border-[#454650] bg-[#292A32] text-[#A5A6B0]',
      ].join(' ')}
    >
      {config?.label || status || 'Unknown status'}
    </span>
  );
}

function StatusConfirmation({
  faculty,
  targetStatus,
  loading,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, onCancel]);

  if (!faculty || !targetStatus) {
    return null;
  }

  const config = ACTION_CONFIG[targetStatus];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
          && !loading
        ) {
          onCancel();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="faculty-status-title"
        className="w-full max-w-md rounded-2xl border border-[#454650] bg-[#1D1F27] p-6 shadow-2xl"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-[#CDB5F7]">
          ACCOUNT MANAGEMENT
        </p>

        <h2
          id="faculty-status-title"
          className="mt-2 text-xl font-semibold text-[#EAEAE6]"
        >
          {config.label} faculty account?
        </h2>

        <div className="mt-5 rounded-xl border border-[#383943] bg-[#14161C] p-4">
          <p className="text-sm font-semibold text-[#EAEAE6]">
            {faculty.fullName}
          </p>

          <p className="mt-1 text-xs text-[#A5A6B0]">
            {faculty.institutionalId}
          </p>
        </div>

        <p className="mt-5 text-sm leading-6 text-[#B5B5C0]">
          {config.description}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <ActionButton
            variant="secondary"
            disabled={loading}
            onClick={onCancel}
          >
            Cancel
          </ActionButton>

          <ActionButton
            variant={config.variant}
            loading={loading}
            onClick={onConfirm}
          >
            Confirm {config.label}
          </ActionButton>
        </div>
      </section>
    </div>
  );
}

export default function FacultyDetails() {
  const navigate = useNavigate();

  const { facultyId, id } = useParams();

  const selectedFacultyId = facultyId || id || '';

  const [faculty, setFaculty] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isUpdating, setIsUpdating] = useState(false);

  const [error, setError] = useState('');

  const [notice, setNotice] = useState('');

  const [confirmation, setConfirmation] = useState(null);

  const loadFaculty = useCallback(async (signal) => {
    if (!selectedFacultyId) {
      setFaculty(null);
      setError('Faculty ID is missing from the URL.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await facultyManagementService.getFaculty(
        selectedFacultyId,
        { signal },
      );

      if (signal?.aborted) {
        return;
      }

      setFaculty(result);
    } catch (requestError) {
      if (
        requestError?.code === 'ERR_CANCELED'
        || signal?.aborted
      ) {
        return;
      }

      setError(
        requestError?.message
        || 'Unable to load faculty details.',
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [selectedFacultyId]);

  useEffect(() => {
    const controller = new AbortController();

    loadFaculty(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadFaculty]);

  const cancelStatusChange = useCallback(() => {
    if (!isUpdating) {
      setConfirmation(null);
    }
  }, [isUpdating]);

  async function confirmStatusChange() {
    if (!confirmation || isUpdating || !selectedFacultyId) {
      return;
    }

    setIsUpdating(true);
    setError('');
    setNotice('');

    try {
      const updatedFaculty =
        await facultyManagementService.updateFacultyStatus(
          selectedFacultyId,
          confirmation.targetStatus,
        );

      setFaculty(updatedFaculty);

      setNotice(
        `Faculty account status successfully updated to ${updatedFaculty.status}.`,
      );

      setConfirmation(null);
    } catch (requestError) {
      setError(
        requestError?.message
        || 'Unable to update faculty account status.',
      );
    } finally {
      setIsUpdating(false);
    }
  }

  function requestStatusChange(targetStatus) {
    if (
      !faculty
      || isUpdating
      || faculty.status === targetStatus
    ) {
      return;
    }

    setNotice('');
    setError('');

    setConfirmation({
      targetStatus,
    });
  }

  function handleEdit() {
    if (!selectedFacultyId) {
      return;
    }

    navigate(
      `/hod/faculty/${encodeURIComponent(selectedFacultyId)}/edit`,
      {
        state: {
          faculty,
        },
      },
    );
  }

  const availableActions = faculty
    ? Object.values(FACULTY_STATUSES).filter(
        (status) => status !== faculty.status,
      )
    : [];

  return (
    <div className="mx-auto w-full max-w-[1000px]">

      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Faculty Details"
        description="Review and manage institutional faculty accounts."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Faculty Management',
            to: '/hod/faculty',
          },
          {
            label: 'Faculty Details',
          },
        ]}
      />

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          {notice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-5"
        >
          <h2 className="text-sm font-semibold text-rose-200">
            Faculty operation unsuccessful
          </h2>

          <p className="mt-2 text-sm leading-6 text-rose-100/90">
            {error}
          </p>

          <ActionButton
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => loadFaculty()}
          >
            Reload faculty details
          </ActionButton>
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-[#343640] bg-[#1D1F27] p-5 text-sm text-[#A5A6B0]"
        >
          Loading faculty details...
        </div>
      )}

      {!isLoading && faculty && (
        <>
          <SectionCard
            eyebrow="FACULTY ACCOUNT"
            title={faculty.fullName || 'Faculty Member'}
            description="Institutional account information retrieved from the department database."
            action={
              <StatusBadge status={faculty.status} />
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <DetailField
                label="Full Name"
                value={faculty.fullName}
              />

              <DetailField
                label="Institutional ID"
                value={faculty.institutionalId}
              />

              <DetailField
                label="Email Address"
                value={faculty.email}
              />

              <DetailField
                label="Account Role"
                value={
                  faculty.role === 'MENTOR'
                    ? 'Mentor / TG'
                    : 'Faculty'
                }
              />

              <DetailField
                label="Account Status"
                value={faculty.status}
              />

              <DetailField
                label="Department"
                value={faculty.department?.name}
              />

              <DetailField
                label="Department Code"
                value={faculty.department?.code}
              />

              <DetailField
                label="Email Verification"
                value={
                  faculty.isEmailVerified
                    ? 'Verified'
                    : 'Not verified'
                }
              />

              <DetailField
                label="Last Login"
                value={
                  faculty.lastLoginAt
                    ? new Date(faculty.lastLoginAt).toLocaleString()
                    : 'Never logged in'
                }
              />

              <DetailField
                label="Account Created"
                value={
                  faculty.createdAt
                    ? new Date(faculty.createdAt).toLocaleString()
                    : 'Not available'
                }
              />

              <DetailField
                label="Last Updated"
                value={
                  faculty.updatedAt
                    ? new Date(faculty.updatedAt).toLocaleString()
                    : 'Not available'
                }
              />

            </div>

            <div className="mt-6 border-t border-[#343640] pt-5">

              <h3 className="text-sm font-semibold text-[#EAEAE6]">
                Academic Assignments
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">

                <DetailField
                  label="Assigned Batches"
                  value={faculty.assignedBatches?.length ?? 0}
                />

                <DetailField
                  label="Assigned Sections"
                  value={faculty.assignedSections?.length ?? 0}
                />

              </div>
            </div>

          </SectionCard>

          <SectionCard
            eyebrow="ACCOUNT LIFECYCLE"
            title="Faculty account actions"
            description="Control the faculty member's institutional account access."
            className="mt-5"
          >
            <div className="flex flex-wrap gap-3">

              {availableActions.includes(FACULTY_STATUSES.ACTIVE) && (
                <ActionButton
                  variant="primary"
                  disabled={isUpdating}
                  onClick={() => {
                    requestStatusChange(
                      FACULTY_STATUSES.ACTIVE,
                    );
                  }}
                >
                  Activate Account
                </ActionButton>
              )}

              {availableActions.includes(FACULTY_STATUSES.SUSPENDED) && (
                <ActionButton
                  variant="secondary"
                  disabled={isUpdating}
                  onClick={() => {
                    requestStatusChange(
                      FACULTY_STATUSES.SUSPENDED,
                    );
                  }}
                >
                  Suspend Account
                </ActionButton>
              )}

              {availableActions.includes(FACULTY_STATUSES.DISABLED) && (
                <ActionButton
                  variant="danger"
                  disabled={isUpdating}
                  onClick={() => {
                    requestStatusChange(
                      FACULTY_STATUSES.DISABLED,
                    );
                  }}
                >
                  Disable Account
                </ActionButton>
              )}

            </div>

            <p className="mt-4 text-xs leading-5 text-[#858590]">
              Status changes are enforced by the backend. Existing
              sessions are revoked when the account status changes.
              Reactivated accounts must sign in again.
            </p>
          </SectionCard>

          <div className="mt-5 flex flex-wrap justify-end gap-3">

            <Link to="/hod/faculty">
              <ActionButton variant="secondary">
                Back to Directory
              </ActionButton>
            </Link>

            <ActionButton
              onClick={handleEdit}
              disabled={isUpdating}
            >
              Edit Faculty Details
            </ActionButton>

          </div>
        </>
      )}

      <StatusConfirmation
        faculty={faculty}
        targetStatus={confirmation?.targetStatus}
        loading={isUpdating}
        onCancel={cancelStatusChange}
        onConfirm={confirmStatusChange}
      />

    </div>
  );
}