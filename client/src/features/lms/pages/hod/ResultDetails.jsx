import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import api from "../../../auth/services/api/axios.js";

import ActionButton from "../../components/ActionButton.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import SectionCard from "../../components/SectionCard.jsx";

const PAGE_SIZE = 20;

const RESULT_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "ENTERED", label: "Entered" },
  { value: "ABSENT", label: "Absent" },
  { value: "EXEMPT", label: "Exempt" },
];

function getAssessmentId(assessment) {
  return assessment?.id || assessment?._id || "";
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    "Unable to retrieve assessment details."
  );
}

function getStatusStyles(status) {
  const styles = {
    DRAFT: "border-[#E5DF98]/30 bg-[#E5DF98]/10 text-[#E5DF98]",
    PUBLISHED:
      "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    CLOSED: "border-red-400/30 bg-red-400/10 text-red-300",
    PENDING: "border-[#E5DF98]/30 bg-[#E5DF98]/10 text-[#E5DF98]",
    ENTERED:
      "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    ABSENT: "border-red-400/30 bg-red-400/10 text-red-300",
    EXEMPT: "border-[#CDB5F7]/30 bg-[#CDB5F7]/10 text-[#CDB5F7]",
  };

  return (
    styles[status] ||
    "border-[#454650] bg-[#292A32] text-[#A7A7B0]"
  );
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#1D1F27] p-4">
      <p className="text-sm text-[#A7A7B0]">{label}</p>

      <p className="mt-2 text-2xl font-semibold text-[#EAEAE6]">
        {value}
      </p>
    </div>
  );
}

export default function ResultDetails() {
  const location = useLocation();

  const routeAssessment = location.state?.result;

  const assessmentId = getAssessmentId(routeAssessment);

  const [assessment, setAssessment] = useState(routeAssessment || null);

  const [results, setResults] = useState([]);

  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    entered: 0,
    absent: 0,
    exempt: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(Boolean(assessmentId));
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

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
              search: debouncedSearch || undefined,
              status: statusFilter || undefined,
            },
            signal,
          },
        );

        if (signal?.aborted) return;

        const data = response?.data?.data || {};

        if (data.assessment) {
          setAssessment((current) => ({
            ...current,
            ...data.assessment,
          }));
        }

        setResults(
          Array.isArray(data.results) ? data.results : [],
        );

        setSummary({
          total: Number(data.summary?.total || 0),
          pending: Number(data.summary?.pending || 0),
          entered: Number(data.summary?.entered || 0),
          absent: Number(data.summary?.absent || 0),
          exempt: Number(data.summary?.exempt || 0),
        });

        setPagination({
          page: Number(data.pagination?.page || 1),
          limit: Number(data.pagination?.limit || PAGE_SIZE),
          total: Number(data.pagination?.total || 0),
          totalPages: Math.max(
            1,
            Number(data.pagination?.totalPages || 1),
          ),
        });
      } catch (requestError) {
        if (!signal?.aborted) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [
      assessmentId,
      page,
      debouncedSearch,
      statusFilter,
    ],
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

  const publishReady = useMemo(
    () =>
      summary.total > 0 &&
      summary.pending === 0,
    [summary.total, summary.pending],
  );

  const handleStatusUpdate = async (nextStatus) => {
    if (!assessmentId || updatingStatus) return;

    const actionLabel =
      nextStatus === "PUBLISHED" ? "publish" : "close";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} this assessment?`,
    );

    if (!confirmed) return;

    setUpdatingStatus(true);
    setError("");
    setNotice("");

    try {
      const response = await api.patch(
        `/v1/assessments/manage/${assessmentId}`,
        {
          status: nextStatus,
        },
      );

      const updatedAssessment =
        response?.data?.data?.assessment;

      if (updatedAssessment) {
        setAssessment((current) => ({
          ...current,
          ...updatedAssessment,
        }));
      }

      setNotice(
        nextStatus === "PUBLISHED"
          ? "Assessment published successfully."
          : "Assessment closed successfully.",
      );

      const controller = new AbortController();

      await loadResults(controller.signal);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!assessmentId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Academic Oversight"
          title="Assessment Details"
          description="Review assessment information and student results."
          breadcrumbs={[
            { label: "HOD Dashboard", to: "/hod/dashboard" },
            { label: "Results", to: "/hod/results" },
            { label: "Details" },
          ]}
        />

        <SectionCard>
          <EmptyState
            title="No assessment selected"
            description="Open assessment details from the Results overview."
            action={
              <Link to="/hod/results">
                <ActionButton variant="secondary">
                  Back to Results
                </ActionButton>
              </Link>
            }
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Oversight"
        title="Assessment Details"
        description="Review assessment configuration, manage its lifecycle and inspect student results."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod/dashboard" },
          { label: "Results", to: "/hod/results" },
          { label: "Details" },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link to="/hod/results">
              <ActionButton variant="secondary">
                Back to Results
              </ActionButton>
            </Link>

            {assessment?.status === "DRAFT" && (
              <Link
                to="/hod/results/edit"
                state={{ result: assessment }}
              >
                <ActionButton variant="secondary">
                  Enter Marks
                </ActionButton>
              </Link>
            )}
          </div>
        }
      />

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/5 p-4"
        >
          <p className="text-sm font-semibold text-red-300">
            Request failed
          </p>

          <p className="mt-2 text-sm text-[#A7A7B0]">
            {error}
          </p>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-300"
        >
          {notice}
        </div>
      )}

      <SectionCard
        title={assessment?.title || "Assessment"}
        description="Assessment configuration and lifecycle information."
        action={
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyles(assessment?.status)}`}
          >
            {assessment?.status || "UNKNOWN"}
          </span>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem
            label="Assessment Type"
            value={assessment?.type}
          />

          <DetailItem
            label="Course"
            value={
              assessment?.course?.title ||
              assessment?.course ||
              "Not available"
            }
          />

          <DetailItem
            label="Course Code"
            value={assessment?.course?.code}
          />

          <DetailItem
            label="Maximum Marks"
            value={assessment?.totalMarks}
          />

          <DetailItem
            label="Passing Marks"
            value={assessment?.passingMarks}
          />

          <DetailItem
            label="Assessment Date"
            value={formatDate(assessment?.assessmentDate)}
          />

          <DetailItem
            label="Published At"
            value={formatDate(assessment?.publishedAt)}
          />

          <DetailItem
            label="Closed At"
            value={formatDate(assessment?.closedAt)}
          />

          <DetailItem
            label="Created By"
            value={assessment?.createdBy?.name}
          />
        </div>

        {assessment?.description && (
          <div className="mt-5 rounded-xl border border-[#343640] bg-[#1D1F27] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#A7A7B0]">
              Description
            </p>

            <p className="mt-2 text-sm leading-6 text-[#EAEAE6]">
              {assessment.description}
            </p>
          </div>
        )}

        {Array.isArray(assessment?.batches) &&
          assessment.batches.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#A7A7B0]">
                Assigned Batches
              </p>

              <div className="flex flex-wrap gap-2">
                {assessment.batches.map((batch) => (
                  <span
                    key={batch.id || batch._id || batch.name}
                    className="rounded-lg border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-3 py-2 text-xs text-[#CDB5F7]"
                  >
                    {batch.name || batch.code || "Batch"}
                  </span>
                ))}
              </div>
            </div>
          )}

        {Array.isArray(assessment?.sections) &&
          assessment.sections.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#A7A7B0]">
                Assigned Sections
              </p>

              <div className="flex flex-wrap gap-2">
                {assessment.sections.map((section) => (
                  <span
                    key={section.id || section._id || section.name}
                    className="rounded-lg border border-[#343640] bg-[#26272B] px-3 py-2 text-xs text-[#EAEAE6]"
                  >
                    {section.name || section.code || "Section"}
                  </span>
                ))}
              </div>
            </div>
          )}
      </SectionCard>

      <SectionCard
        title="Assessment Lifecycle"
        description="Publish completed assessment results or close an already published assessment."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Students"
            value={summary.total}
          />

          <SummaryCard
            label="Pending"
            value={summary.pending}
          />

          <SummaryCard
            label="Entered"
            value={summary.entered}
          />

          <SummaryCard
            label="Absent / Exempt"
            value={`${summary.absent} / ${summary.exempt}`}
          />
        </div>

        <div className="mt-5 rounded-xl border border-[#343640] bg-[#1D1F27] p-4">
          {assessment?.status === "DRAFT" && (
            <>
              <p className="text-sm font-semibold text-[#EAEAE6]">
                Draft assessment
              </p>

              <p className="mt-2 text-sm leading-6 text-[#A7A7B0]">
                All student results must be marked as Entered, Absent
                or Exempt before publishing. Pending results must be zero.
              </p>

              <div className="mt-4">
                <ActionButton
                  type="button"
                  disabled={!publishReady || updatingStatus || loading}
                  loading={updatingStatus}
                  onClick={() => handleStatusUpdate("PUBLISHED")}
                >
                  Publish Assessment
                </ActionButton>
              </div>

              {!publishReady && (
                <p className="mt-3 text-xs text-[#E5DF98]">
                  Publishing is unavailable until at least one student
                  is assigned and all pending results are completed.
                </p>
              )}
            </>
          )}

          {assessment?.status === "PUBLISHED" && (
            <>
              <p className="text-sm font-semibold text-emerald-300">
                Assessment published
              </p>

              <p className="mt-2 text-sm leading-6 text-[#A7A7B0]">
                Results have been published. You can now close this
                assessment. Closed assessments cannot be reopened.
              </p>

              <div className="mt-4">
                <ActionButton
                  type="button"
                  variant="secondary"
                  disabled={updatingStatus}
                  loading={updatingStatus}
                  onClick={() => handleStatusUpdate("CLOSED")}
                >
                  Close Assessment
                </ActionButton>
              </div>
            </>
          )}

          {assessment?.status === "CLOSED" && (
            <>
              <p className="text-sm font-semibold text-red-300">
                Assessment closed
              </p>

              <p className="mt-2 text-sm leading-6 text-[#A7A7B0]">
                This assessment is closed. Its lifecycle is complete
                and it cannot be reopened.
              </p>
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Student Results"
        description="Review student-wise marks and result statuses."
      >
        <div className="mb-5 grid gap-4 md:grid-cols-2">
          <SearchInput
            name="resultStudentSearch"
            label="Search students"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student name or institutional ID..."
          />

          <div>
            <label
              htmlFor="result-status-filter"
              className="mb-2 block text-sm font-medium text-[#EAEAE6]"
            >
              Result Status
            </label>

            <select
              id="result-status-filter"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-[#343640] bg-[#1D1F27] px-4 py-3 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7]"
            >
              {RESULT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-[#343640] bg-[#1D1F27] px-5 py-12 text-center">
            <p className="text-sm text-[#A7A7B0]">
              Loading student results...
            </p>
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            title="No student results found"
            description="No records match the selected search and status filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#26272B] text-xs uppercase tracking-wide text-[#A7A7B0]">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Institutional ID</th>
                    <th className="px-4 py-3">Marks</th>
                    <th className="px-4 py-3">Percentage</th>
                    <th className="px-4 py-3">Outcome</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {results.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-[#26272B]/50"
                    >
                      <td className="px-4 py-4 font-medium text-[#EAEAE6]">
                        {record.student?.fullName || "Unknown Student"}
                      </td>

                      <td className="px-4 py-4 text-[#A7A7B0]">
                        {record.student?.institutionalId || "—"}
                      </td>

                      <td className="px-4 py-4 text-[#EAEAE6]">
                        {record.marksObtained ?? "—"} /{" "}
                        {record.totalMarks ?? assessment?.totalMarks ?? "—"}
                      </td>

                      <td className="px-4 py-4 text-[#EAEAE6]">
                        {record.percentage === null ||
                        record.percentage === undefined
                          ? "—"
                          : `${Number(record.percentage).toFixed(1)}%`}
                      </td>

                      <td className="px-4 py-4">
                        {record.passed === null ||
                        record.passed === undefined ? (
                          <span className="text-[#A7A7B0]">—</span>
                        ) : (
                          <span
                            className={
                              record.passed
                                ? "text-emerald-300"
                                : "text-red-300"
                            }
                          >
                            {record.passed ? "Passed" : "Failed"}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusStyles(record.status)}`}
                        >
                          {record.status}
                        </span>
                      </td>

                      <td className="max-w-[220px] px-4 py-4 text-[#A7A7B0]">
                        {record.remarks || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#343640] pt-4">
              <p className="text-sm text-[#A7A7B0]">
                Showing {results.length} of {pagination.total} students
                {" · "}
                Page {pagination.page} of {pagination.totalPages}
              </p>

              <div className="flex gap-2">
                <ActionButton
                  type="button"
                  variant="secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </ActionButton>

                <ActionButton
                  type="button"
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
    </div>
  );
}