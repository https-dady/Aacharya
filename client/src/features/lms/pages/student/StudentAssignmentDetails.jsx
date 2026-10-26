import { Link, useParams } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

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

export default function StudentAssignmentDetails() {
  const { assignmentId } = useParams();

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title="Assignment Details"
        description="Review assignment information, instructions, deadlines, and submission requirements."
        breadcrumbs={[
          {
            label: 'Dashboard',
            to: '/student/dashboard',
          },
          {
            label: 'Assignments',
            to: '/student/assignments',
          },
          {
            label: 'Assignment Details',
          },
        ]}
        actions={
          <Link
            to="/student/assignments"
            className={[
              'inline-flex min-h-10 items-center justify-center',
              'rounded-xl border border-[#454650] px-4 py-2',
              'text-sm font-semibold text-[#CDB5F7]',
              'transition-colors hover:border-[#CDB5F7]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7]',
            ].join(' ')}
          >
            ← Back to Assignments
          </Link>
        }
      />

      <div className="mb-6 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-3 py-1.5 text-xs font-medium text-[#CDB5F7]">
              Assignment Reference
            </span>

            <h2 className="mt-4 text-xl font-semibold text-[#EAEAE6]">
              Assignment Information
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A5A6B0]">
              Assignment details will be displayed after the assignment
              record is retrieved from the backend.
            </p>
          </div>

          <div className="shrink-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-xs text-[#858590]">
              Assignment ID
            </p>

            <p className="mt-2 max-w-[240px] break-all text-sm font-medium text-[#EAEAE6]">
              {assignmentId || 'Unavailable'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard
            eyebrow="OVERVIEW"
            title="Assignment Information"
            description="Details published by your faculty for this assignment."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailField
                label="Assignment Title"
                value={null}
              />

              <DetailField
                label="Course"
                value={null}
              />

              <DetailField
                label="Course Code"
                value={null}
              />

              <DetailField
                label="Faculty"
                value={null}
              />

              <DetailField
                label="Published On"
                value={null}
              />

              <DetailField
                label="Due Date"
                value={null}
              />
            </div>

            <div className="mt-5">
              <EmptyState
                title="Assignment details unavailable"
                description="The assignment record, description, and faculty instructions will appear here when the assignment-details API is connected."
                icon={
                  <span aria-hidden="true" className="text-2xl">
                    ▣
                  </span>
                }
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="REQUIREMENTS"
            title="Assignment Instructions"
            description="Read the requirements carefully before preparing your submission."
          >
            <EmptyState
              title="No instructions available"
              description="Assignment instructions, attachments, accepted file formats, and submission guidelines will appear here when provided by your faculty."
              icon={
                <span aria-hidden="true" className="text-2xl">
                  ▤
                </span>
              }
            />
          </SectionCard>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard
            eyebrow="SUBMISSION"
            title="Submission Status"
            description="Review your submission information and evaluation status."
          >
            <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-[#A5A6B0]">
                  Current Status
                </span>

                <span className="rounded-full border border-[#454650] bg-[#252630] px-2.5 py-1 text-xs font-medium text-[#A5A6B0]">
                  Unavailable
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-[#A5A6B0]">
                Your submission status will appear after your assignment
                record and submission history are loaded.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <DetailField
                label="Submitted On"
                value={null}
              />

              <DetailField
                label="Marks Obtained"
                value={null}
              />

              <DetailField
                label="Faculty Feedback"
                value={null}
              />
            </div>

            <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
              <p className="text-sm font-semibold text-amber-200">
                Submission unavailable
              </p>

              <p className="mt-2 text-sm leading-6 text-[#C4B49A]">
                File uploads and submission actions will be enabled after
                the approved backend contract, file-validation rules,
                and submission workflow are integrated.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="NEXT STEP"
            title="Continue Learning"
            description="Return to your academic workspace."
          >
            <div className="flex flex-col gap-3">
              <Link
                to="/student/assignments"
                className={[
                  'inline-flex min-h-11 items-center justify-center',
                  'rounded-xl bg-[#CDB5F7] px-4 py-2.5',
                  'text-sm font-semibold text-[#20172D]',
                  'transition-colors hover:bg-[#DDCCFA]',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[#CDB5F7]',
                ].join(' ')}
              >
                All Assignments
                <span className="ml-2" aria-hidden="true">
                  →
                </span>
              </Link>

              <Link
                to="/student/courses"
                className={[
                  'inline-flex min-h-11 items-center justify-center',
                  'rounded-xl border border-[#454650] px-4 py-2.5',
                  'text-sm font-semibold text-[#CDB5F7]',
                  'transition-colors hover:border-[#CDB5F7]',
                  'hover:bg-[#CDB5F7]/10',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[#CDB5F7]',
                ].join(' ')}
              >
                My Courses
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}