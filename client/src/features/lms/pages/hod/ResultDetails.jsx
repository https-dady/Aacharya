import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../../../auth/services/api/axios.js";

import ActionButton from "../../components/ActionButton.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";

const PAGE_SIZE = 10;

const RESULT_STATUSES = {
  PENDING: "Pending",
  ENTERED: "Entered",
  ABSENT: "Absent",
  EXEMPT: "Exempt",
};

const STATUS_STYLES = {
  PENDING: "border-[#E5DF98]/30 bg-[#E5DF98]/10 text-[#E5DF98]",
  ENTERED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  ABSENT: "border-red-400/30 bg-red-400/10 text-red-300",
  EXEMPT: "border-[#A7A7B0]/30 bg-[#A7A7B0]/10 text-[#A7A7B0]",
};

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#1D1F27] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#A7A7B0]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-[#EAEAE6]">
        {value ?? "Not available"}
      </p>
    </div>
  );
}

function getAssessmentId(assessment) {
  return assessment?.id || assessment?._id || "";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPercentage(value) {
  if (value === null || value === undefined) return "—";

  return `${value}%`;
}

function getResponseData(response) {
  return response?.data?.data || {};
}

export default function ResultDetails() {
  const location = useLocation();
  const navigate = useNavigate();

  const assessment = location.state?.result;

  const assessmentId = getAssessmentId(assessment);

  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    entered: 0,
    absent: 0,
    exempt: 0,
  });

  const [assessmentDetails, setAssessmentDetails] = useState(
    assessment || null,
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(Boolean(assessmentId));
  const [error, setError] = useState("");

  const loadResults = useCallback(
    async (signal) => {
      if (!assessmentId) return;

      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          `/v1/assessments/manage/${assessmentId}/results`,
          {
            params: {
              page,
              limit: PAGE_SIZE,
              search: search.trim() || undefined,
              status: statusFilter || undefined,
            },
            signal,
          },
        );

        if (signal?.aborted) return;

        const data = getResponseData(response);

        setResults(Array.isArray(data.results) ? data.results : []);

        setSummary({
          total: Number(data.summary?.total) || 0,
          pending: Number(data.summary?.pending) || 0,
          entered: Number(data.summary?.entered) || 0,
          absent: Number(data.summary?.absent) || 0,
          exempt: Number(data.summary?.exempt) || 0,
        });

        setPagination({
          page: Number(data.pagination?.page) || 1,
          limit: Number(data.pagination?.limit) || PAGE_SIZE,
          total: Number(data.pagination?.total) || 0,
          totalPages: Math.max(
            1,
            Number(data.pagination?.totalPages) || 1,
          ),
        });

        if (data.assessment) {
          setAssessmentDetails((current) => ({
            ...current,
            ...data.assessment,
          }));
        }
      } catch (requestError) {
        if (signal?.aborted) return;

        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load student results.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [assessmentId, page, search, statusFilter],
  );

  useEffect(() => {
    const controller = new AbortController();

    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        loadResults(controller.signal);
      }
    });

    return () => controller.abort();
  }, [loadResults]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const handleRefresh = () => {
    const controller = new AbortController();
    loadResults(controller.signal);
  };

  const handleEditResults = () => {
    navigate("/hod/results/edit", {
      state: {
        result: assessmentDetails,
        results,
        summary,
      },
    });
  };

  if (!assessmentId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Academic Oversight"
          title="Result Details"
          description="Review assessment information and student-wise performance."
          breadcrumbs={[
            { label: "HOD Dashboard", to: "/hod/dashboard" },
            { label: "Results", to: "/hod/results" },
            { label: "Details" },
          ]}
        />

        <SectionCard>
          <div className="px-5 py-10 text-center">
            <h2 className="text-lg font-semibold text-[#EAEAE6]">
              No assessment selected
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#A7A7B0]">
              Open this page from an assessment record to view its
              student-wise results.
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

  const currentAssessment = assessmentDetails || {};

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Oversight"
        title="Assessment Details"
        description="Review assessment information, student result records and marks-entry progress."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod/dashboard" },
          { label: "Results", to: "/hod/results" },
          { label: "Details" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton
              variant="secondary"
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh
            </ActionButton>

            {currentAssessment.status === "DRAFT" && (
              <ActionButton
                onClick={handleEditResults}
                disabled={loading}
              >
                Enter / Edit Marks
              </ActionButton>
            )}
          </div>
        }
      />

      <SectionCard
        title={currentAssessment.title || "Assessment"}
        description={currentAssessment.description || "Assessment information"}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem
            label="Assessment Type"
            value={currentAssessment.type}
          />

          <DetailItem
            label="Status"
            value={currentAssessment.status}
          />

          <DetailItem
            label="Course"
            value={
              currentAssessment.course?.title ||
                currentAssessment.course?.name ||
                "—"
            }
          />

          <DetailItem
            label="Course Code"
            value={currentAssessment.course?.code}
          />

          <DetailItem
            label="Semester"
            value={currentAssessment.course?.semester}
          />

          <DetailItem
            label="Assessment Date"
            value={formatDate(currentAssessment.assessmentDate)}
          />

          <DetailItem
            label="Maximum Marks"
            value={currentAssessment.totalMarks}
          />

          <DetailItem
            label="Passing Marks"
            value={currentAssessment.passingMarks}
          />

          <DetailItem
            label="Created By"
            value={currentAssessment.createdBy?.name}
          />
        </div>

        {Array.isArray(currentAssessment.batches) &&
          currentAssessment.batches.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-[#EAEAE6]">
                Assigned Batches
              </p>

              <div className="flex flex-wrap gap-2">
                {currentAssessment.batches.map((batch) => (
                  <span
                    key={batch.id}
                    className="rounded-lg border border-[#343640] bg-[#26272B] px-3 py-2 text-xs text-[#A7A7B0]"
                  >
                    {batch.name}
                    {batch.code ? ` (${batch.code})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

        {Array.isArray(currentAssessment.sections) &&
          currentAssessment.sections.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-[#EAEAE6]">
                Assigned Sections
              </p>

              <div className="flex flex-wrap gap-2">
                {currentAssessment.sections.map((section) => (
                  <span
                    key={section.id}
                    className="rounded-lg border border-[#343640] bg-[#26272B] px-3 py-2 text-xs text-[#A7A7B0]"
                  >
                    {section.name}
                    {section.code ? ` (${section.code})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DetailItem label="Total Students" value={summary.total} />
        <DetailItem label="Marks Entered" value={summary.entered} />
        <DetailItem label="Pending" value={summary.pending} />
        <DetailItem label="Absent" value={summary.absent} />
        <DetailItem label="Exempt" value={summary.exempt} />
      </div>

      <SectionCard
        title="Student-wise Results"
        description="Student marks and result status for this assessment."
      >
        <div className="mb-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <label
              htmlFor="student-result-search"
              className="mb-2 block text-sm font-medium text-[#EAEAE6]"
            >
              Search Student
            </label>

            <input
              id="student-result-search"
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by student name or ID"
              className="w-full rounded-xl border border-[#343640] bg-[#1D1F27] px-4 py-3 text-sm text-[#EAEAE6] outline-none placeholder:text-[#858590] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
            />
          </div>

          <div>
            <label
              htmlFor="student-result-status"
              className="mb-2 block text-sm font-medium text-[#EAEAE6]"
            >
              Result Status
            </label>

            <select
              id="student-result-status"
              value={statusFilter}
              onChange={handleStatusChange}
              className="w-full rounded-xl border border-[#343640] bg-[#1D1F27] px-3 py-3 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
            >
              <option value="">All Statuses</option>

              {Object.entries(RESULT_STATUSES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-[#A7A7B0]">
              Loading student results...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-5">
            <p className="text-sm font-semibold text-red-300">
              Unable to load results
            </p>

            <p className="mt-2 text-sm text-[#A7A7B0]">
              {error}
            </p>

            <div className="mt-4">
              <ActionButton
                variant="secondary"
                onClick={handleRefresh}
              >
                Try Again
              </ActionButton>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-[#343640] bg-[#1D1F27] px-5 py-10 text-center">
            <p className="text-sm font-semibold text-[#EAEAE6]">
              No student records found
            </p>

            <p className="mt-2 text-sm text-[#A7A7B0]">
              No results match the selected search or status filter.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#26272B] text-xs uppercase tracking-wide text-[#A7A7B0]">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Institutional ID</th>
                    <th className="px-4 py-3">Marks</th>
                    <th className="px-4 py-3">Percentage</th>
                    <th className="px-4 py-3">Performance</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {results.map((record) => {
                    const status = record.status || "PENDING";

                    return (
                      <tr
                        key={record.id}
                        className="text-[#EAEAE6] transition-colors hover:bg-[#26272B]/70"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold">
                            {record.student?.fullName || "Unknown Student"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-[#A7A7B0]">
                          {record.student?.institutionalId || "—"}
                        </td>

                        <td className="px-4 py-4 text-[#A7A7B0]">
                          {record.marksObtained === null ||
                          record.marksObtained === undefined
                            ? "—"
                            : `${record.marksObtained} / ${record.totalMarks}`}
                        </td>

                        <td className="px-4 py-4 text-[#A7A7B0]">
                          {formatPercentage(record.percentage)}
                        </td>

                        <td className="px-4 py-4">
                          {record.passed === null ||
                          record.passed === undefined ? (
                            <span className="text-[#858590]">—</span>
                          ) : record.passed ? (
                            <span className="font-medium text-emerald-300">
                              Passed
                            </span>
                          ) : (
                            <span className="font-medium text-red-300">
                              Failed
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                              STATUS_STYLES[status] ||
                              "border-[#343640] bg-[#26272B] text-[#A7A7B0]"
                            }`}
                          >
                            {RESULT_STATUSES[status] || status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-[#A7A7B0]">
                Page {pagination.page} of {pagination.totalPages}
                {" · "}
                {pagination.total} student records
              </p>

              <div className="flex items-center gap-2">
                <ActionButton
                  variant="secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </ActionButton>

                <ActionButton
                  variant="secondary"
                  disabled={
                    page >= pagination.totalPages || loading
                  }
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </ActionButton>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      <div className="flex justify-end">
        <Link to="/hod/results">
          <ActionButton variant="secondary">
            Back to Results
          </ActionButton>
        </Link>
      </div>
    </div>
  );
}