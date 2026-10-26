import { Link, useLocation } from "react-router-dom";
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
        {value === undefined || value === null || value === ""
          ? "Not provided"
          : String(value)}
      </p>
    </div>
  );
}

export default function ResultDetails() {
  const location = useLocation();
  const result = location.state?.result;

  if (!result) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Academic Management"
          title="Result Details"
          description="Review assessment results and publication information."
          breadcrumbs={[
            { label: "HOD Dashboard", to: "/hod" },
            { label: "Results", to: "/hod/results" },
            { label: "Details" },
          ]}
        />

        <SectionCard>
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl text-slate-400">
              !
            </div>

            <h2 className="text-lg font-semibold text-white">
              Result details unavailable
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              No assessment result information was provided to this page.
              Open a record from the results overview when records are
              available.
            </p>

            <div className="mt-6">
              <Link to="/hod/results">
                <ActionButton variant="secondary">
                  Back to Results
                </ActionButton>
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  const title =
    result.examName || result.title || result.name || "Untitled Assessment";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Management"
        title={title}
        description="Review assessment information and result publication status."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod" },
          { label: "Results", to: "/hod/results" },
          { label: "Details" },
        ]}
        actions={
          <Link to="/hod/results">
            <ActionButton variant="secondary">
              Back to Results
            </ActionButton>
          </Link>
        }
      />

      <SectionCard
        title="Assessment Information"
        description="Assessment metadata supplied by the previous page."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="Assessment Name" value={title} />
          <DetailItem label="Course" value={result.course} />
          <DetailItem label="Course Code" value={result.courseCode} />
          <DetailItem label="Batch" value={result.batch} />
          <DetailItem label="Section" value={result.section} />
          <DetailItem label="Assessment Type" value={result.assessmentType} />
          <DetailItem label="Assessment Date" value={result.examDate} />
          <DetailItem label="Total Marks" value={result.totalMarks} />
          <DetailItem label="Passing Marks" value={result.passingMarks} />
        </div>
      </SectionCard>

      <SectionCard
        title="Publication Information"
        description="Review the current publication metadata when supplied."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem label="Publication Status" value={result.status} />
          <DetailItem
            label="Published At"
            value={result.publishedAt}
          />
          <DetailItem
            label="Last Updated"
            value={result.updatedAt}
          />
          <DetailItem
            label="Student Count"
            value={result.studentCount}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Student Marks"
        description="Individual marks and grades require actual result records."
      >
        <div className="rounded-xl border border-dashed border-white/10 px-5 py-8 text-center">
          <p className="text-sm font-medium text-slate-300">
            Individual marks are not available
          </p>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            This assessment record does not provide a student-wise marks
            collection. Marks, grades, pass status, and result statistics
            will be displayed after the actual result data is integrated.
          </p>
        </div>
      </SectionCard>

      <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
        <p className="text-sm font-medium text-amber-200">
          Backend integration pending
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-400">
          This page reads assessment information from React Router navigation
          state. It does not retrieve student marks, calculate grades, publish
          results, or change academic records.
        </p>
      </div>
    </div>
  );
}