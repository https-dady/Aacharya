import { Link, useLocation } from "react-router-dom";

import ActionButton from "../../components/ActionButton.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#1D1F27] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#A7A7B0]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-[#EAEAE6]">
        {value || "Not available"}
      </p>
    </div>
  );
}

export default function ResultDetails() {
  const location = useLocation();
  const result = location.state?.result;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Oversight"
        title="Result Details"
        description="Review the available information for a selected assessment result."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod/dashboard" },
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

      {!result ? (
        <SectionCard>
          <EmptyState
            title="No result selected"
            description="Open this page from a result record to review its details. No result information was supplied."
          />
          <div className="mt-5 flex justify-center">
            <Link to="/hod/results">
              <ActionButton variant="secondary">
                Return to Results
              </ActionButton>
            </Link>
          </div>
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title={result.title || result.name || "Assessment Result"}
            description="Assessment information supplied by the selected record."
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DetailItem
                label="Assessment"
                value={result.title || result.name}
              />
              <DetailItem label="Course" value={result.course} />
              <DetailItem label="Course Code" value={result.courseCode} />
              <DetailItem label="Batch" value={result.batch} />
              <DetailItem label="Section" value={result.section} />
              <DetailItem label="Faculty" value={result.faculty} />
              <DetailItem label="Assessment Type" value={result.type} />
              <DetailItem
                label="Maximum Marks"
                value={result.totalMarks}
              />
              <DetailItem
                label="Passing Marks"
                value={result.passingMarks}
              />
              <DetailItem
                label="Assessment Date"
                value={result.date || result.scheduledAt}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Performance Information"
            description="Marks and performance details, when supplied by the selected record."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Marks Obtained" value={result.marksObtained} />
              <DetailItem label="Grade" value={result.grade} />
              <DetailItem label="Percentage" value={result.percentage} />
              <DetailItem label="Result Status" value={result.status} />
            </div>

            {result.remarks && (
              <div className="mt-4 rounded-xl border border-[#343640] bg-[#1D1F27] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#A7A7B0]">
                  Remarks
                </p>
                <p className="mt-2 text-sm leading-6 text-[#EAEAE6]">
                  {result.remarks}
                </p>
              </div>
            )}
          </SectionCard>

          <div className="rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 p-4">
            <p className="text-sm font-semibold text-[#CDB5F7]">
              Read-only overview
            </p>
            <p className="mt-1 text-sm leading-6 text-[#A7A7B0]">
              This page displays only information supplied by the selected
              record. It does not fetch, calculate, edit, or persist assessment
              results.
            </p>
          </div>
        </>
      )}
    </div>
  );
}