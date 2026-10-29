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

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

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
  const styles = {
    ACTIVE: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    SUSPENDED: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    DISABLED: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  };

  return (
    <span
      className={[
        'inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold',
        styles[status]
          || 'border-[#454650] bg-[#292A32] text-[#A5A6B0]',
      ].join(' ')}
    >
      {status || 'Unknown status'}
    </span>
  );
}

function getResponseData(response) {
  const body = response?.data;

  return body?.data ?? body ?? {};
}

function normalizeFaculty(data) {
  return data?.faculty ?? data?.user ?? data ?? null;
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || fallback
  );
}

export default function FacultyDetails() {
  const navigate = useNavigate();
  const { facultyId, id } = useParams();

  const selectedFacultyId = facultyId || id || '';

  const [faculty, setFaculty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
      const response = await api.get(
        `/v1/provisioning/faculty/${encodeURIComponent(selectedFacultyId)}`,
        { signal },
      );

      const fetchedFaculty = normalizeFaculty(
        getResponseData(response),
      );

      if (!fetchedFaculty?.id && !fetchedFaculty?._id) {
        throw new Error(
          'The server did not return the requested faculty record.',
        );
      }

      setFaculty(fetchedFaculty);
    } catch (requestError) {
      if (
        requestError?.code === 'ERR_CANCELED'
        || requestError?.name === 'AbortError'
        || requestError?.name === 'CanceledError'
      ) {
        return;
      }

      setError(
        getErrorMessage(
          requestError,
          'Unable to load faculty details.',
        ),
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

  function handleEdit() {
    if (!selectedFacultyId) {
      return;
    }

    navigate(
      `/hod/faculty/${encodeURIComponent(selectedFacultyId)}/edit`,
      {
        state: { faculty },
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Faculty Details"
        description="Review a faculty member's institutional account and departmental role."
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

      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-[#343640] bg-[#1D1F27] p-5 text-sm text-[#A5A6B0]"
        >
          Loading faculty details...
        </div>
      )}

      {!isLoading && error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5"
        >
          <h2 className="text-sm font-semibold text-rose-200">
            Faculty record unavailable
          </h2>

          <p className="mt-2 text-sm leading-6 text-rose-100/90">
            {error}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {selectedFacultyId && (
              <ActionButton
                type="button"
                variant="secondary"
                onClick={() => loadFaculty()}
              >
                Retry
              </ActionButton>
            )}

            <Link to="/hod/faculty">
              <ActionButton variant="secondary">
                Return to Directory
              </ActionButton>
            </Link>
          </div>
        </div>
      )}

      {!isLoading && !error && faculty && (
        <>
          <SectionCard
            eyebrow="FACULTY ACCOUNT"
            title={faculty.fullName || 'Faculty Member'}
            description="Institutional account information retrieved from the backend."
            action={<StatusBadge status={faculty.status} />}
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
                    : faculty.role || 'Faculty'
                }
              />

              <DetailField
                label="Account Status"
                value={faculty.status}
              />

              <DetailField
                label="Department"
                value={
                  faculty.department?.name
                  || faculty.departmentName
                }
              />

              <DetailField
                label="Email Verification"
                value={
                  faculty.isEmailVerified === true
                    ? 'Verified'
                    : faculty.isEmailVerified === false
                      ? 'Not verified'
                      : 'Not available'
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
            </div>
          </SectionCard>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Link to="/hod/faculty">
              <ActionButton variant="secondary">
                Back to Directory
              </ActionButton>
            </Link>

            <ActionButton
              type="button"
              onClick={handleEdit}
            >
              Edit Faculty Details
            </ActionButton>
          </div>
        </>
      )}

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        Faculty records are loaded through the authenticated HOD's
        department-scoped backend endpoint. Access restrictions are
        enforced by the server.
      </p>
    </div>
  );
}