import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import ActionButton from "../../components/ActionButton.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import SectionCard from "../../components/SectionCard.jsx";

export default function ResultOverview() {
  const [search, setSearch] = useState("");

  // Real result data will be connected during backend integration.
  const results = [];

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return results;

    return results.filter((result) =>
      [
        result.title,
        result.course,
        result.courseCode,
        result.batch,
        result.section,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Oversight"
        title="Results Overview"
        description="Review assessment results and academic performance across your department."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod/dashboard" },
          { label: "Results" },
        ]}
        actions={
          <Link to="/hod/dashboard">
            <ActionButton variant="secondary">Back to Dashboard</ActionButton>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard
          title="Assessment Results"
          description="Department-level assessment records."
          variant="default"
        >
          <p className="text-sm leading-6 text-[#A7A7B0]">
            View available assessment results once the result data source is
            connected.
          </p>
        </SectionCard>

        <SectionCard
          title="Academic Performance"
          description="Performance information for department assessments."
          variant="elevated"
        >
          <p className="text-sm leading-6 text-[#A7A7B0]">
            Performance summaries will appear when actual assessment data is
            available.
          </p>
        </SectionCard>
      </div>

      <SectionCard
        title="Result Records"
        description="Search the available assessment result records."
        action={
          <span className="rounded-full border border-[#343640] bg-[#26272B] px-3 py-1 text-xs font-medium text-[#A7A7B0]">
            {filteredResults.length} records
          </span>
        }
      >
        <div className="mb-5 max-w-xl">
          <SearchInput
            name="result-search"
            label="Search result records"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by assessment, course, batch or section"
          />
        </div>

        {filteredResults.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#343640]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#26272B] text-xs uppercase tracking-wide text-[#A7A7B0]">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Assessment
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Course
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Batch
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Section
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#343640]">
                {filteredResults.map((result) => (
                  <tr
                    key={result.id}
                    className="text-[#EAEAE6] transition-colors hover:bg-[#26272B]/70"
                  >
                    <td className="px-4 py-4 font-medium">
                      {result.title}
                    </td>
                    <td className="px-4 py-4 text-[#A7A7B0]">
                      {result.course}
                    </td>
                    <td className="px-4 py-4 text-[#A7A7B0]">
                      {result.batch || "—"}
                    </td>
                    <td className="px-4 py-4 text-[#A7A7B0]">
                      {result.section || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to="/hod/results/details"
                        state={{ result }}
                        className="rounded-lg font-semibold text-[#CDB5F7] hover:text-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                      >
                        View details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={search ? "No matching results" : "No result records available"}
            description={
              search
                ? "Try another search term."
                : "Result records will appear here after actual assessment data is connected. No sample records are being displayed."
            }
          />
        )}
      </SectionCard>

      <div className="rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 p-4">
        <p className="text-sm font-semibold text-[#CDB5F7]">
          Backend integration pending
        </p>
        <p className="mt-1 text-sm leading-6 text-[#A7A7B0]">
          This page currently provides the result overview interface only.
          Search and result counts will use real records once data integration
          is implemented.
        </p>
      </div>
    </div>
  );
}