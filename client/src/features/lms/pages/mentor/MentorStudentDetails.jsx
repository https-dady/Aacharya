import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { Link, useParams } from 'react-router-dom';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import mentorStudentDetailsService from '../../services/mentorStudentDetailsService.js';

function StudentIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-6 w-6"
    >
      <circle cx="12" cy="8" r="3.5" />

      <path
        d="M4.5 20v-1.5a7.5 7.5 0 0 1 15 0V20"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#343640] bg-[#17181F] p-4">
      <p className="text-xs font-medium text-[#858590]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {value || 'Not available'}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
}) {
  return (
    <article className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
      <p className="text-sm font-medium text-[#A5A6B0]">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold text-[#EAEAE6]">
        {value}
      </p>

      <p className="mt-2 text-xs text-[#858590]">
        {description}
      </p>
    </article>
  );
}

function Feedback({ error, success }) {
  if (!error && !success) {
    return null;
  }

  return (
    <div
      role={error ? 'alert' : 'status'}
      aria-live="polite"
      className={[
        'rounded-xl border px-4 py-3 text-sm leading-6',
        error
          ? 'border-rose-400/25 bg-rose-400/10 text-rose-300'
          : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
      ].join(' ')}
    >
      {error || success}
    </div>
  );
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Unable to load student details.'
  );
}

function getStatusStyles(status) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-400/10 text-emerald-300';

    case 'SUSPENDED':
      return 'bg-amber-400/10 text-amber-300';

    case 'DISABLED':
      return 'bg-rose-400/10 text-rose-300';

    default:
      return 'bg-slate-400/10 text-slate-300';
  }
}

export default function MentorStudentDetails() {
  const { studentId } = useParams();

  const [details, setDetails] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState('');

  const loadDetails = useCallback(async (signal) => {
    if (!studentId) {
      setError('Student reference is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result =
        await mentorStudentDetailsService.getStudentDetails(
          studentId,
          { signal },
        );

      if (!signal.aborted) {
        setDetails(result);
      }
    } catch (requestError) {
      if (
        !signal.aborted
        && requestError?.name !== 'AbortError'
        && requestError?.code !== 'ERR_CANCELED'
      ) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [studentId]);

  useEffect(() => {
    const controller = new AbortController();

    loadDetails(controller.signal);

    return () => controller.abort();
  }, [loadDetails]);

  async function handleSendActivationEmail() {
    setActivationError('');
    setActivationSuccess('');

    if (!studentId) {
      setActivationError('Student reference is missing.');
      return;
    }

    if (details?.student?.isAccountActivated) {
      setActivationError(
        'This student account has already been activated.',
      );
      return;
    }

    if (!details?.student?.email) {
      setActivationError(
        'The student does not have a registered email address.',
      );
      return;
    }

    setActivationLoading(true);

    try {
      const response = await import(
        '../../../auth/services/api/axios.js'
      );

      const api = response.default;

      const result = await api.post(
        `/v1/provisioning/students/${encodeURIComponent(studentId)}/activation`,
      );

      const body = result?.data;

      setActivationSuccess(
        body?.message
        || body?.data?.message
        || 'Activation email request completed successfully.',
      );
    } catch (requestError) {
      setActivationError(getErrorMessage(requestError));
    } finally {
      setActivationLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <PageHeader
          eyebrow="Mentor workspace"
          title="Student Details"
          description="Loading the student's account and academic information."
        />

        <div
          className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-8 text-sm text-[#A5A6B0]"
          role="status"
        >
          Loading student details...
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <PageHeader
          eyebrow="Mentor workspace"
          title="Student Details"
          description="Review student account information."
          breadcrumbs={[
            {
              label: 'Mentor',
              to: '/mentor/dashboard',
            },
            {
              label: 'Assigned Students',
              to: '/mentor/students',
            },
            {
              label: 'Student Details',
            },
          ]}
        />

        <SectionCard title="Unable to retrieve student">
          <div className="space-y-4">
            <p
              className="text-sm leading-6 text-rose-300"
              role="alert"
            >
              {error || 'Student details are unavailable.'}
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  const controller = new AbortController();
                  loadDetails(controller.signal);
                }}
                className="rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#191621] transition hover:bg-[#DCCBFA]"
              >
                Retry
              </button>

              <Link
                to="/mentor/students"
                className="rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6]"
              >
                Back to students
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  const { student, department, sections, attendance } = details;

  const initials = student.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Mentor workspace"
        title="Student Details"
        description="Review the student's account, assigned academic sections and attendance summary."
        breadcrumbs={[
          {
            label: 'Mentor',
            to: '/mentor/dashboard',
          },
          {
            label: 'Assigned Students',
            to: '/mentor/students',
          },
          {
            label: 'Student Details',
          },
        ]}
        actions={
          <Link
            to="/mentor/students"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-2 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#303139]"
          >
            Back to students
          </Link>
        }
      />

      <section className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-xl font-bold text-[#CDB5F7]">
            {initials || <StudentIcon />}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="break-words text-xl font-semibold text-[#EAEAE6]">
              {student.fullName}
            </h2>

            <p className="mt-1 break-all text-sm text-[#A5A6B0]">
              {student.email || 'Email not available'}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  getStatusStyles(student.status),
                ].join(' ')}
              >
                {student.status}
              </span>

              <span className="rounded-full border border-[#3B3C43] px-3 py-1 text-xs text-[#B8B8C2]">
                {student.institutionalId}
              </span>
            </div>
          </div>
        </div>
      </section>

      <Feedback
        error={activationError}
        success={activationSuccess}
      />

      <SectionCard
        eyebrow="Student profile"
        title="Personal information"
        description="Account information retrieved from the institution's student records."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailField
            label="Full name"
            value={student.fullName}
          />

          <DetailField
            label="Institutional ID"
            value={student.institutionalId}
          />

          <DetailField
            label="Email address"
            value={student.email}
          />

          <DetailField
            label="Department"
            value={department?.name}
          />

          <DetailField
            label="Account status"
            value={student.status}
          />

          <DetailField
            label="Account activation"
            value={
              student.isAccountActivated
                ? 'Activated'
                : 'Pending activation'
            }
          />

          <DetailField
            label="Email verification"
            value={
              student.isEmailVerified
                ? 'Verified'
                : 'Not verified'
            }
          />

          <DetailField
            label="Registered on"
            value={
              student.createdAt
                ? new Date(student.createdAt).toLocaleDateString()
                : null
            }
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Academic placement"
        description="Batches and sections associated with this student within your assigned mentor scope."
      >
        {sections.length === 0 ? (
          <EmptyState
            title="No assigned sections"
            description="No active section assignment is available for this student."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {sections.map((section) => (
              <article
                key={section.id}
                className="rounded-xl border border-[#343640] bg-[#17181F] p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-[#EAEAE6]">
                    {section.name}
                  </h3>

                  <span className="rounded-full bg-[#CDB5F7]/10 px-3 py-1 text-xs font-semibold text-[#CDB5F7]">
                    {section.code}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p className="text-[#858590]">
                    Batch:{' '}
                    <span className="text-[#EAEAE6]">
                      {section.batch?.name || 'Not available'}
                    </span>
                  </p>

                  <p className="text-[#858590]">
                    Batch code:{' '}
                    <span className="text-[#EAEAE6]">
                      {section.batch?.code || 'Not available'}
                    </span>
                  </p>

                  <p className="text-[#858590]">
                    Academic year:{' '}
                    <span className="text-[#EAEAE6]">
                      {section.batch?.academicYear || 'Not available'}
                    </span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Attendance overview"
        description="Attendance records across the student's sections assigned to you."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total records"
            value={attendance.total}
            description="Recorded attendance sessions"
          />

          <SummaryCard
            label="Present"
            value={attendance.present}
            description="Sessions marked present"
          />

          <SummaryCard
            label="Absent"
            value={attendance.absent}
            description="Sessions marked absent"
          />

          <SummaryCard
            label="Attendance percentage"
            value={`${attendance.percentage}%`}
            description={`${attendance.late} late attendance records`}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Account activation"
        description="Send an activation email to a student who has not yet activated their account."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#EAEAE6]">
              Student account activation
            </h3>

            <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
              {student.isAccountActivated
                ? 'This student account has already been activated.'
                : 'The student can use the activation email to complete their account setup.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSendActivationEmail}
            disabled={
              student.isAccountActivated
              || !student.email
              || activationLoading
            }
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#191621] transition-colors hover:bg-[#DCCBFA] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activationLoading
              ? 'Sending email...'
              : student.isAccountActivated
                ? 'Already activated'
                : 'Send activation email'}
          </button>
        </div>
      </SectionCard>

      <div className="rounded-2xl border border-[#E5DF98]/15 bg-[#E5DF98]/[0.04] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#E5DF98]">
          Access control
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#B8B8C2]">
          Student details are returned only when the authenticated
          mentor owns at least one active section assigned to that
          student. The backend validates this relationship on every
          request.
        </p>
      </div>
    </div>
  );
}