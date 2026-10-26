import { useLocation, Link } from "react-router-dom";
import PageHeader from "../../../../components/common/PageHeader";
import SectionCard from "../../../../components/common/SectionCard";
import ActionButton from "../../../../components/common/ActionButton";

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-200">
        {value || "Not provided"}
      </p>
    </div>
  );
}

export default function AssignmentDetails() {
  const location = useLocation();
  const assignment = location.state?.assignment;

  if (!assignment) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Academic Management"
          title="Assignment Details"
          description="Review assignment information, deadlines, and academic context."
          breadcrumbs={[
            { label: "HOD Dashboard", to: "/hod" },
            { label: "Assignments", to: "/hod/assignments" },
            { label: "Details" },
          ]}
        />

        <SectionCard>
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl text-slate-400">
              !
            </div>

            <h2 className="text-lg font-semibold text-white">
              Assignment details unavailable
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              No assignment information was provided to this page. Open an
              assignment from the assignment list when assignment records are
              connected.
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

  const title = assignment.title || assignment.name || "Untitled Assignment";

  const status = assignment.status || "Not specified";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Management"
        title={title}
        description="Review assignment details and its academic allocation."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod" },
          { label: "Assignments", to: "/hod/assignments" },
          { label: "Details" },
        ]}
        actions={
          <Link to="/hod/assignments">
            <ActionButton variant="secondary">Back to Assignments</ActionButton>
          </Link>
        }
      />

      <SectionCard
        title="Assignment Overview"
        description="Assignment information supplied by the previous page."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem
            label="Assignment Title"
            value={title}
          />

          <DetailItem
            label="Course"
            value={assignment.course}
          />

          <DetailItem
            label="Course Code"
            value={assignment.courseCode}
          />

          <DetailItem
            label="Faculty"
            value={assignment.faculty}
          />

          <DetailItem
            label="Batch"
            value={assignment.batch}
          />

          <DetailItem
            label="Section"
            value={assignment.section}
          />

          <DetailItem
            label="Due Date"
            value={assignment.dueDate}
          />

          <DetailItem
            label="Status"
            value={status}
          />

          <DetailItem
            label="Total Marks"
            value={assignment.totalMarks}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Assignment Instructions"
        description="Description and instructions provided for this assignment."
      >
        {assignment.description || assignment.instructions ? (
          <div className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300">
            {assignment.description || assignment.instructions}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-300">
              No instructions available
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Assignment instructions will appear here when provided.
            </p>
          </div>
        )}
      </SectionCard>

      <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
        <p className="text-sm font-medium text-amber-200">
          Frontend integration pending
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          Assignment details currently come from React Router navigation state.
          Refreshing this page or opening it directly may leave the assignment
          unavailable. Persistent records and backend integration will be
          handled in the designated integration phase.
        </p>
      </div>
    </div>
  );
}