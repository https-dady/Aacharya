import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ActionButton from "../../components/ActionButton.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import SectionCard from "../../components/SectionCard.jsx";

import assessmentManagementService, {
  ASSESSMENT_TYPES,
  ASSESSMENT_STATUSES,
} from "../../services/assessmentManagementService.js";

const PAGE_SIZE = 10;

const TYPE_LABELS = {
  [ASSESSMENT_TYPES.INTERNAL]: "Internal",
  [ASSESSMENT_TYPES.MID_TERM_1]: "Mid Term 1",
  [ASSESSMENT_TYPES.MID_TERM_2]: "Mid Term 2",
  [ASSESSMENT_TYPES.CLASS_TEST]: "Class Test",
  [ASSESSMENT_TYPES.PRACTICAL]: "Practical",
  [ASSESSMENT_TYPES.ASSIGNMENT]: "Assignment",
  [ASSESSMENT_TYPES.OTHER]: "Other",
};

const STATUS_STYLES = {
  [ASSESSMENT_STATUSES.DRAFT]:
    "border-[#E5DF98]/30 bg-[#E5DF98]/10 text-[#E5DF98]",
  [ASSESSMENT_STATUSES.PUBLISHED]:
    "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  [ASSESSMENT_STATUSES.CLOSED]:
    "border-[#A7A7B0]/30 bg-[#A7A7B0]/10 text-[#A7A7B0]",
};

function getAssessmentTitle(assessment) {
  return assessment?.title || "Untitled Assessment";
}

function getCourseName(assessment) {
  if (typeof assessment?.course === "string") {
    return assessment.course;
  }

  return (
    assessment?.course?.name ||
    assessment?.course?.title ||
    assessment?.course?.code ||
    "—"
  );
}

function getAssessmentType(assessment) {
  return TYPE_LABELS[assessment?.type] || assessment?.type || "—";
}

function getAssessmentStatus(assessment) {
  return assessment?.status || ASSESSMENT_STATUSES.DRAFT;
}

function getPagination(response) {
  const meta = response?.meta || {};
  const pagination = meta?.pagination || response?.pagination || {};

  return {
    page: Number(pagination.page) || 1,
    limit: Number(pagination.limit) || PAGE_SIZE,
    total: Number(pagination.total) || 0,
    totalPages: Math.max(1, Number(pagination.totalPages) || 1),
  };
}

function getAssessmentArray(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.assessments)) {
    return response.data.assessments;
  }

  if (Array.isArray(response?.assessments)) {
    return response.assessments;
  }

  return [];
}

function SummaryCard({ title, value, description }) {
  return (
    <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
      <p className="text-sm font-medium text-[#A7A7B0]">{title}</p>

      <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">
        {value}
      </p>

      <p className="mt-2 text-xs text-[#858590]">{description}</p>
    </div>
  );
}

export default function ResultOverview() {
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAssessments = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");

      try {
        const response = await assessmentManagementService.listAssessments(
          {
            page,
            limit: PAGE_SIZE,
            search: search.trim(),
            type: typeFilter || undefined,
            status: statusFilter || undefined,
          },
          { signal },
        );

        if (signal?.aborted) {
          return;
        }

        setAssessments(getAssessmentArray(response));
        setPagination(getPagination(response));
      } catch (requestError) {
        if (signal?.aborted) {
          return;
        }

        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load assessment records.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [page, search, typeFilter, statusFilter],
  );

  useEffect(() => {
    const controller = new AbortController();

    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        loadAssessments(controller.signal);
      }
    });

    return () => controller.abort();
  }, [loadAssessments]);

  const summary = useMemo(() => {
    return assessments.reduce(
      (counts, assessment) => {
        const status = getAssessmentStatus(assessment);

        counts.total += 1;

        if (status === ASSESSMENT_STATUSES.DRAFT) {
          counts.draft += 1;
        }

        if (status === ASSESSMENT_STATUSES.PUBLISHED) {
          counts.published += 1;
        }

        if (status === ASSESSMENT_STATUSES.CLOSED) {
          counts.closed += 1;
        }

        return counts;
      },
      {
        total: assessments.length,
        draft: 0,
        published: 0,
        closed: 0,
      },
    );
  }, [assessments]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handleTypeChange = (event) => {
    setTypeFilter(event.target.value);
    setPage(1);
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const handleRefresh = () => {
    const controller = new AbortController();
    loadAssessments(controller.signal);
  };

  const handleViewDetails = (assessment) => {
    navigate("/hod/results/details", {
      state: {
        result: assessment,
      },
    });
  };

  const hasFilters = Boolean(search || typeFilter || statusFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Oversight"
        title="Results & Assessments"
        description="Create assessments, manage examination records and review department-level academic results."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod/dashboard" },
          { label: "Results" },
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

            <ActionButton
              onClick={() => navigate("/hod/results/new")}
            >
              + Create Assessment
            </ActionButton>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Assessments"
          value={pagination.total}
          description="Assessments in your department"
        />

        <SummaryCard
          title="Draft"
          value={summary.draft}
          description="Awaiting publication"
        />

        <SummaryCard
          title="Published"
          value={summary.published}
          description="Results published"
        />

        <SummaryCard
          title="Closed"
          value={summary.closed}
          description="Completed assessments"
        />
      </div>

      <SectionCard
        title="Assessment Records"
        description="Search, filter and manage assessments across your department."
        action={
          <span className="rounded-full border border-[#343640] bg-[#26272B] px-3 py-1 text-xs font-medium text-[#A7A7B0]">
            {pagination.total} records
          </span>
        }
      >
        <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_200px]">
          <SearchInput
            name="assessment-search"
            label="Search assessments"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by assessment or course"
          />

          <div>
            <label
              htmlFor="assessment-type-filter"
              className="mb-2 block text-sm font-medium text-[#EAEAE6]"
            >
              Assessment Type
            </label>

            <select
              id="assessment-type-filter"
              value={typeFilter}
              onChange={handleTypeChange}
              className="w-full rounded-xl border border-[#343640] bg-[#1D1F27] px-3 py-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
            >
              <option value="">All Types</option>

              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="assessment-status-filter"
              className="mb-2 block text-sm font-medium text-[#EAEAE6]"
            >
              Status
            </label>

            <select
              id="assessment-status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="w-full rounded-xl border border-[#343640] bg-[#1D1F27] px-3 py-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
            >
              <option value="">All Statuses</option>

              {Object.values(ASSESSMENT_STATUSES).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <p className="text-sm text-[#A7A7B0]">
              Loading assessment records...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-5">
            <p className="text-sm font-semibold text-red-300">
              Unable to load assessments
            </p>

            <p className="mt-2 text-sm text-[#A7A7B0]">{error}</p>

            <div className="mt-4">
              <ActionButton variant="secondary" onClick={handleRefresh}>
                Try Again
              </ActionButton>
            </div>
          </div>
        ) : assessments.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#26272B] text-xs uppercase tracking-wide text-[#A7A7B0]">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Assessment
                    </th>

                    <th scope="col" className="px-4 py-3">
                      Course
                    </th>

                    <th scope="col" className="px-4 py-3">
                      Type
                    </th>

                    <th scope="col" className="px-4 py-3">
                      Total Marks
                    </th>

                    <th scope="col" className="px-4 py-3">
                      Date
                    </th>

                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>

                    <th scope="col" className="px-4 py-3">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {assessments.map((assessment) => {
                    const status = getAssessmentStatus(assessment);

                    return (
                      <tr
                        key={assessment._id || assessment.id}
                        className="text-[#EAEAE6] transition-colors hover:bg-[#26272B]/70"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold">
                            {getAssessmentTitle(assessment)}
                          </p>

                          <p className="mt-1 text-xs text-[#858590]">
                            {assessment.department?.name ||
                              assessment.departmentName ||
                              "Department assessment"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-[#A7A7B0]">
                          {getCourseName(assessment)}
                        </td>

                        <td className="px-4 py-4 text-[#A7A7B0]">
                          {getAssessmentType(assessment)}
                        </td>

                        <td className="px-4 py-4 text-[#A7A7B0]">
                          {assessment.totalMarks ?? "—"}
                        </td>

                        <td className="px-4 py-4 text-[#A7A7B0]">
                          {assessment.assessmentDate
                            ? new Date(
                                assessment.assessmentDate,
                              ).toLocaleDateString()
                            : "—"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                              STATUS_STYLES[status] ||
                              "border-[#343640] bg-[#26272B] text-[#A7A7B0]"
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(assessment)}
                            className="rounded-lg font-semibold text-[#CDB5F7] transition-colors hover:text-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                          >
                            View Details
                          </button>
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
                {pagination.total} total assessments
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
                  disabled={page >= pagination.totalPages || loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </ActionButton>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title={
              hasFilters
                ? "No matching assessments"
                : "No assessments available"
            }
            description={
              hasFilters
                ? "Try changing your search or filter criteria."
                : "Create your first assessment to start managing department results."
            }
          >
            {!hasFilters && (
              <ActionButton
                onClick={() => navigate("/hod/results/new")}
              >
                + Create Assessment
              </ActionButton>
            )}
          </EmptyState>
        )}
      </SectionCard>
    </div>
  );
}