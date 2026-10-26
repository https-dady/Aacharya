import { Link, useParams } from 'react-router-dom';

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
      <p className="text-xs font-medium text-[#858590]">{label}</p>

      <p className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {value || 'Not available'}
      </p>
    </div>
  );
}

function InformationNotice({ title, description }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#343640] bg-[#17181F] p-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#CDB5F7]/10 text-[#CDB5F7]">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="h-4 w-4"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5m0-8h.01" strokeLinecap="round" />
        </svg>
      </span>

      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[#EAEAE6]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function MentorStudentDetails() {
  const { studentId } = useParams();

  /*
   * The inspected project baseline does not establish a confirmed API
   * contract for fetching an individual mentor-assigned student.
   *
   * Do not invent student details or treat a route parameter as proof
   * that the student belongs to the authenticated mentor.
   */
  const student = null;

  if (!student) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <PageHeader
          eyebrow="Mentor workspace"
          title="Student Details"
          description="Review a student's profile, account status and academic information."
          breadcrumbs={[
            { label: 'Mentor', to: '/mentor/dashboard' },
            { label: 'Assigned Students', to: '/mentor/students' },
            { label: 'Student Details' },
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
          description="Personal details, enrollment information and account status."
        >
          <EmptyState
            title="Student record is not connected yet"
            description={
              studentId
                ? `Student reference: ${studentId}. The individual student API has not been connected yet, so the profile cannot be loaded.`
                : 'Open this page from an assigned student record once the student details route and backend integration are available.'
            }
            icon={<StudentIcon />}
            className="border-0 bg-transparent py-10"
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
          title="Account management"
          description="Account actions must be available only for students assigned to the authenticated mentor."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InformationNotice
              title="Edit student information"
              description="Editing will be enabled after the actual student record and permitted editable fields are established."
            />

            <InformationNotice
              title="Account status"
              description="Active or inactive status must come from the actual student record. Status changes must be authorized by the backend."
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Academic overview"
          description="Academic information associated with this student."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DetailField label="Assigned batch" value={null} />
            <DetailField label="Assigned section" value={null} />
            <DetailField label="Attendance summary" value={null} />
            <DetailField label="Academic performance" value={null} />
          </div>
        </SectionCard>

        <div className="rounded-2xl border border-[#E5DF98]/15 bg-[#E5DF98]/[0.04] p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[#E5DF98]">
            Access control requirement
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#B8B8C2]">
            The backend must verify that the requested student belongs to a
            batch or section assigned to the current mentor before returning
            profile or academic information. Hiding a student in the UI is
            not sufficient authorization.
          </p>
        </div>
      </div>
    );
  }

  return null;
}