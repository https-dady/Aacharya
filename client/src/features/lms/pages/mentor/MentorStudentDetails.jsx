import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

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
          ? 'border-red-400/25 bg-red-400/10 text-red-300'
          : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
      ].join(' ')}
    >
      {error || success}
    </div>
  );
}

export default function MentorStudentDetails() {
  const { studentId } = useParams();

  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState('');

  async function handleSendActivationEmail() {
    setActivationError('');
    setActivationSuccess('');

    if (!studentId) {
      setActivationError(
        'Student reference is missing. Return to the student directory and open a student record.',
      );

      return;
    }

    setActivationLoading(true);

    try {
      const response = await api.post(
        `/v1/provisioning/students/${encodeURIComponent(studentId)}/activation`,
      );

      const responseBody = response?.data;
      const result = responseBody?.data ?? responseBody;

      const successMessage =
        typeof responseBody?.message === 'string'
          ? responseBody.message
          : typeof result?.message === 'string'
            ? result.message
            : 'Activation email request completed successfully. Ask the student to check their registered email inbox.';

      setActivationSuccess(successMessage);
    } catch (requestError) {
      setActivationError(
        requestError?.response?.data?.message
          || requestError?.message
          || 'Could not send the activation email. Please try again.',
      );
    } finally {
      setActivationLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Mentor workspace"
        title="Student Details"
        description="Review a student's account and manage the student activation email."
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
            className={[
              'inline-flex min-h-10 items-center justify-center',
              'rounded-xl border border-[#3B3C43] bg-[#26272B]',
              'px-4 py-2 text-sm font-semibold text-[#EAEAE6]',
              'transition-colors hover:bg-[#303139]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7]',
            ].join(' ')}
          >
            Back to students
          </Link>
        }
      />

      <SectionCard
        eyebrow="Student profile"
        title="Profile information"
        description="The student profile and academic information will be displayed when the details API is connected."
      >
        <EmptyState
          title="Student profile is not connected yet"
          description={
            studentId
              ? `Student reference: ${studentId}. Profile information is not loaded yet.`
              : 'Open this page from a student record to manage its account.'
          }
          icon={<StudentIcon />}
          className="border-0 bg-transparent py-8"
          action={
            <Link
              to="/mentor/students"
              className={[
                'inline-flex min-h-10 items-center justify-center',
                'rounded-xl bg-[#CDB5F7] px-4 py-2',
                'text-sm font-semibold text-[#191621]',
                'transition-colors hover:bg-[#DCCBFA]',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-[#CDB5F7]',
              ].join(' ')}
            >
              Return to assigned students
            </Link>
          }
        />
      </SectionCard>

      <SectionCard
        title="Account activation"
        description="Send a single-use activation link to the student's registered email address."
      >
        <div className="space-y-4">
          <Feedback
            error={activationError}
            success={activationSuccess}
          />

          <div className="rounded-xl border border-[#343640] bg-[#17181F] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[#EAEAE6]">
                  Student account activation
                </h3>

                <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
                  The student receives an email link to set their own
                  password. The activation link expires after 24 hours
                  and can be used only once.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSendActivationEmail}
                disabled={!studentId || activationLoading}
                className={[
                  'inline-flex min-h-11 shrink-0 items-center',
                  'justify-center rounded-xl bg-[#CDB5F7]',
                  'px-4 py-2.5 text-sm font-semibold text-[#191621]',
                  'transition-colors hover:bg-[#DCCBFA]',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[#CDB5F7]',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                ].join(' ')}
              >
                {activationLoading
                  ? 'Sending email…'
                  : 'Send activation email'}
              </button>
            </div>
          </div>

          <p className="text-xs leading-5 text-[#858590]">
            If the student cannot find the email, check the registered
            email address and ask them to check their spam folder.
            Sending a new link may invalidate an earlier pending link.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Academic overview"
        description="Academic information associated with this student."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailField
            label="Assigned batch"
            value={null}
          />

          <DetailField
            label="Assigned section"
            value={null}
          />

          <DetailField
            label="Attendance summary"
            value={null}
          />

          <DetailField
            label="Academic performance"
            value={null}
          />
        </div>
      </SectionCard>

      <div className="rounded-2xl border border-[#E5DF98]/15 bg-[#E5DF98]/[0.04] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#E5DF98]">
          Access control
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#B8B8C2]">
          The backend must verify the authenticated mentor's assignment
          before sending an activation email. A student ID in the URL
          alone must never grant access.
        </p>
      </div>
    </div>
  );
}