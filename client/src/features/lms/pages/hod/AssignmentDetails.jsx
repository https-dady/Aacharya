import { Link, useLocation } from "react-router-dom";

import ActionButton from "../../components/ActionButton.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#9697A2]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {value === undefined || value === null || value === ""
          ? "Not provided"
          : String(value)}
      </p>
    </div>
  );
}

export default function AssignmentDetails() {
  const location = useLocation();
  const assignment = location.state?.assignment;

  if (!assignment) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="ACADEMIC OVERSIGHT"
          title="Assignment Details"
          description="Review assignment information, deadlines, and academic context."
          breadcrumbs={[
            { label: "HOD Dashboard", to: "/hod/dashboard" },
            { label: "Assignments", to: "/hod/assignments" },
            { label: "Details" },
          ]}
        />

        <SectionCard>
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#454650] bg-[#26272B] text-2xl text-[#CDB5F7]">
              !
            </div>

            <h2 className="text-lg font-semibold text-[#EAEAE6]">
              Assignment details unavailable
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-[#A5A6B0]">
              No assignment information was provided to this page. Open an
              assignment from the assignment directory when records are
              available.
            </p>

            <div className="mt-6">
              <Link to="/hod/assignments">
                <ActionButton variant="secondary">
                  Back to Assignments
                </ActionButton>
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  const title =
    assignment.title || assignment.name || "Untitled Assignment";

  const course =
    assignment.courseName || assignment.course;

  const faculty =
    assignment.facultyName || assignment.faculty;

  const batch =
    assignment.batchName || assignment.batch;

  const section =
    assignment.sectionName || assignment.section;

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title={title}
        description="Review assignment information and its academic allocation."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod/dashboard" },
          { label: "Assignments", to: "/hod/assignments" },
          { label: "Details" },
        ]}
        actions={
          <Link to="/hod/assignments">
            <ActionButton variant="secondary">
              Back to Assignments
            </ActionButton>
          </Link>
        }
      />

      <SectionCard
        eyebrow="ASSIGNMENT INFORMATION"
        title="Assignment Overview"
        description="Details supplied by the selected assignment record."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="Assignment Title" value={title} />
          <DetailItem label="Course" value={course} />
          <DetailItem label="Course Code" value={assignment.courseCode} />
          <DetailItem label="Faculty" value={faculty} />
          <DetailItem label="Batch" value={batch} />
          <DetailItem label="Section" value={section} />
          <DetailItem label="Due Date" value={assignment.dueDate} />
          <DetailItem label="Status" value={assignment.status} />
          <DetailItem label="Total Marks" value={assignment.totalMarks} />
        </div>
      </SectionCard>

      <div className="mt-6">
        <SectionCard
          eyebrow="INSTRUCTIONS"
          title="Assignment Description"
          description="Instructions supplied with the assignment."
        >
          {assignment.description || assignment.instructions ? (
            <div className="whitespace-pre-wrap rounded-xl border border-[#343640] bg-[#191A21] p-4 text-sm leading-7 text-[#D0D0D8]">
              {assignment.description || assignment.instructions}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#454650] px-5 py-8 text-center">
              <p className="text-sm font-medium text-[#D0D0D8]">
                No instructions available
              </p>

              <p className="mt-2 text-sm text-[#9697A2]">
                Instructions will appear here when provided by the assignment
                record.
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-5 rounded-xl border border-[#454650] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#E5DF98]">
          Backend integration pending
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          This page reads assignment information from React Router navigation
          state. It does not fetch or update persistent assignment records.
          Opening the page directly or refreshing it may leave the details
          unavailable.
        </p>
      </div>
    </div>
  );
}