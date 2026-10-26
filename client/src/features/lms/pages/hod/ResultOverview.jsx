import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../../../components/common/PageHeader";
import SectionCard from "../../../../components/common/SectionCard";
import SearchInput from "../../../../components/common/SearchInput";
import EmptyState from "../../../../components/common/EmptyState";
import ActionButton from "../../../../components/common/ActionButton";

const results = [];

function SummaryCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm text-slate-400">{label}</p>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function ResultOverview() {
  const [search, setSearch] = useState("");

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return results;

    return results.filter((result) =>
      [
        result.examName,
        result.course,
        result.courseCode,
        result.batch,
        result.section,
        result.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Management"
        title="Results Overview"
        description="Review assessment result records and monitor result publication across academic courses."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod" },
          { label: "Results" },
        ]}
        actions={
          <Link to="/hod/courses">
            <ActionButton variant="secondary">
              View Courses
            </ActionButton>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Result Records"
          value="—"
          description="Assessment result records available"
        />

        <SummaryCard
          label="Published"
          value="—"
          description="Results released for student access"
        />

        <SummaryCard
          label="Pending Publication"
          value="—"
          description="Results awaiting publication"
        />

        <SummaryCard
          label="Assessments"
          value="—"
          description="Assessments with result records"
        />
      </div>

      <SectionCard
        title="Results Catalogue"
        description="Search assessment result records when data becomes available."
      >
        <div className="mb-5">
          <SearchInput
            name="resultSearch"
            label="Search results"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by exam, course, batch, section..."
          />
        </div>

        {filteredResults.length === 0 ? (
          <EmptyState
            title={
              search
                ? "No matching results"
                : "No result records available"
            }
            description={
              search
                ? "Try another search term."
                : "Result records will appear here once assessment data is connected."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-medium">Assessment</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Batch</th>
                  <th className="px-4 py-3 font-medium">Section</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredResults.map((result) => (
                  <tr
                    key={result.id}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-200">
                        {result.examName || "Untitled assessment"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {result.courseCode || "Course code unavailable"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-300">
                      {result.course || "—"}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-300">
                      {result.batch || "—"}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-300">
                      {result.section || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                        {result.status || "Unspecified"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <Link
                        to="/hod/results/details"
                        state={{ result }}
                        className="text-sm font-medium text-indigo-300 transition hover:text-indigo-200"
                      >
                        View details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
        <p className="text-sm font-medium text-amber-200">
          Backend integration pending
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-400">
          Result records and summary counts are not connected to a backend
          yet. This page does not calculate grades, publish results, or modify
          student marks.
        </p>
      </div>
    </div>
  );
}