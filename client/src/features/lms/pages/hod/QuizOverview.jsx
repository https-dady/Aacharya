import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import ActionButton from "../../components/ActionButton.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import SectionCard from "../../components/SectionCard.jsx";

import quizManagementService from "../../services/quizManagementService.js";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "CLOSED", label: "Closed" },
];

function SummaryCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
      <p className="text-sm text-[#A5A6B0]">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-[#EAEAE6]">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#9697A2]">
        {description}
      </p>
    </div>
  );
}

function getCourseName(quiz) {
  if (quiz.course && typeof quiz.course === "object") {
    return quiz.course.title || quiz.course.name || "—";
  }

  return quiz.courseName || quiz.course || "—";
}

function getCourseCode(quiz) {
  if (quiz.course && typeof quiz.course === "object") {
    return quiz.course.code || quiz.course.courseCode || "";
  }

  return quiz.courseCode || "";
}

function getFacultyName(quiz) {
  const faculty = quiz.course?.faculty ?? quiz.faculty;

  if (faculty && typeof faculty === "object") {
    return (
      faculty.fullName ||
      faculty.name ||
      faculty.email ||
      "Faculty details unavailable"
    );
  }

  if (typeof faculty === "string" && faculty.trim()) {
    return "Faculty details unavailable";
  }

  return "Not assigned";
}

function getSchedule(quiz) {
  if (!quiz.startAt) {
    return "Not scheduled";
  }

  const start = new Date(quiz.startAt);

  if (Number.isNaN(start.getTime())) {
    return "Invalid schedule";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(start);
}

function getStatusLabel(status) {
  const normalized = String(status || "DRAFT").toUpperCase();

  if (normalized === "PUBLISHED") return "Published";
  if (normalized === "CLOSED") return "Closed";

  return "Draft";
}

function getStatusStyles(status) {
  switch (String(status || "DRAFT").toUpperCase()) {
    case "PUBLISHED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

    case "CLOSED":
      return "border-[#CDB5F7]/30 bg-[#CDB5F7]/10 text-[#D8CBFF]";

    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }
}

function getScheduleCategory(quiz, now) {
  if (String(quiz.status || "").toUpperCase() === "CLOSED") {
    return "completed";
  }

  const endAt = quiz.endAt ? new Date(quiz.endAt) : null;

  if (endAt && !Number.isNaN(endAt.getTime()) && endAt < now) {
    return "completed";
  }

  const startAt = quiz.startAt ? new Date(quiz.startAt) : null;

  if (
    startAt &&
    !Number.isNaN(startAt.getTime()) &&
    startAt > now
  ) {
    return "upcoming";
  }

  return "other";
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    "Unable to load quizzes. Please try again."
  );
}

function normalizePagination(pagination, currentPage, itemCount) {
  const total = Number(pagination?.total ?? itemCount);
  const pages = Number(
    pagination?.pages ?? Math.max(1, Math.ceil(total / PAGE_SIZE)),
  );

  return {
    page: Number(pagination?.page ?? currentPage),
    pages: Math.max(1, pages),
    total,
    hasPreviousPage:
      pagination?.hasPreviousPage ??
      Number(pagination?.page ?? currentPage) > 1,
    hasNextPage:
      pagination?.hasNextPage ??
      Number(pagination?.page ?? currentPage) < pages,
  };
}

export default function QuizOverview() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");

  const [quizzes, setQuizzes] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await quizManagementService.listQuizzes({
        page,
        limit: PAGE_SIZE,
        search: search.trim(),
        status: statusFilter,
        semester: semesterFilter,
      });

      const items = Array.isArray(result?.items)
        ? result.items
        : [];

      setQuizzes(items);
      setPagination(
        normalizePagination(result?.pagination, page, items.length),
      );
    } catch (requestError) {
      setQuizzes([]);
      setPagination({
        page: 1,
        pages: 1,
        total: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      });
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, semesterFilter]);

  useEffect(() => {
    let isActive = true;

    Promise.resolve().then(() => {
      if (isActive) {
        loadQuizzes();
      }
    });

    return () => {
      isActive = false;
    };
  }, [loadQuizzes, refreshKey]);

  const summary = useMemo(() => {
    const now = new Date();

    return {
      total: pagination.total,
      upcoming: quizzes.filter(
        (quiz) => getScheduleCategory(quiz, now) === "upcoming",
      ).length,
      published: quizzes.filter(
        (quiz) =>
          String(quiz.status || "").toUpperCase() === "PUBLISHED",
      ).length,
      completed: quizzes.filter(
        (quiz) => getScheduleCategory(quiz, now) === "completed",
      ).length,
    };
  }, [quizzes, pagination.total]);

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function handleStatusChange(event) {
    setStatusFilter(event.target.value);
    setPage(1);
  }

  function handleSemesterChange(event) {
    setSemesterFilter(event.target.value);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setSemesterFilter("");
    setPage(1);
  }

  async function handleDelete(quiz) {
    const quizId = quiz.id;

    if (!quizId) {
      setError("This quiz does not have a valid identifier.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${quiz.title || "this quiz"}"? The server may reject deletion if student attempts already exist.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(quizId);
    setError("");

    try {
      await quizManagementService.deleteQuiz(quizId);

      if (quizzes.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setRefreshKey((current) => current + 1);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDeletingId("");
    }
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "" ||
    semesterFilter !== "";

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Quiz Overview"
        description="Review quizzes across courses, monitor scheduling, and oversee academic assessments."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod/dashboard" },
          { label: "Quizzes" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/hod/quizzes/new">
              <ActionButton>
                Create Quiz
              </ActionButton>
            </Link>

            <Link to="/hod/courses">
              <ActionButton variant="secondary">
                View Courses
              </ActionButton>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Quizzes"
          value={loading ? "—" : summary.total}
          description="Quizzes across academic courses"
        />

        <SummaryCard
          label="Upcoming"
          value={loading ? "—" : summary.upcoming}
          description="Scheduled for a future date on this page"
        />

        <SummaryCard
          label="Published"
          value={loading ? "—" : summary.published}
          description="Published quizzes on this page"
        />

        <SummaryCard
          label="Completed"
          value={loading ? "—" : summary.completed}
          description="Completed quizzes on this page"
        />
      </div>

      <SectionCard
        eyebrow="ASSESSMENT MANAGEMENT"
        title="Quiz Catalogue"
        description="Search, filter, review, update, and manage quizzes within your department."
      >
        <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,1fr)_190px_170px_auto] lg:items-end">
          <SearchInput
            name="quizSearch"
            label="Search quizzes"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by quiz title..."
          />

          <div>
            <label
              htmlFor="quizStatusFilter"
              className="mb-2 block text-sm font-medium text-[#D0D0D8]"
            >
              Status
            </label>

            <select
              id="quizStatusFilter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="quizSemesterFilter"
              className="mb-2 block text-sm font-medium text-[#D0D0D8]"
            >
              Semester
            </label>

            <input
              id="quizSemesterFilter"
              type="text"
              value={semesterFilter}
              onChange={handleSemesterChange}
              maxLength={30}
              placeholder="e.g. 3"
              className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition placeholder:text-[#777986] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
              aria-describedby="quizSemesterHelp"
            />

            <p
              id="quizSemesterHelp"
              className="mt-1.5 text-xs text-[#858590]"
            >
              Enter the exact semester value to filter quizzes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => setRefreshKey((current) => current + 1)}
              loading={loading}
            >
              Refresh
            </ActionButton>

            {hasActiveFilters && (
              <ActionButton
                type="button"
                variant="ghost"
                onClick={clearFilters}
              >
                Clear
              </ActionButton>
            )}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-5"
          >
            <p className="text-sm font-medium text-red-300">
              Quiz management request failed
            </p>

            <p className="mt-2 text-sm leading-6 text-red-200/80">
              {error}
            </p>

            <ActionButton
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              Try Again
            </ActionButton>
          </div>
        )}

        {loading ? (
          <div
            role="status"
            className="rounded-xl border border-[#343640] bg-[#191A21] px-5 py-12 text-center"
          >
            <p className="text-sm text-[#C7C7D0]">
              Loading quiz records...
            </p>
          </div>
        ) : quizzes.length === 0 ? (
          <EmptyState
            title={
              hasActiveFilters
                ? "No matching quizzes"
                : "No quiz records available"
            }
            description={
              hasActiveFilters
                ? "Try changing your search term or filters."
                : "Create a quiz to begin managing assessments for your department."
            }
            action={
              hasActiveFilters ? (
                <ActionButton variant="secondary" onClick={clearFilters}>
                  Clear Filters
                </ActionButton>
              ) : (
                <Link to="/hod/quizzes/new">
                  <ActionButton>
                    Create Quiz
                  </ActionButton>
                </Link>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-[#202129]">
                  <tr className="border-b border-[#343640] text-xs uppercase tracking-wider text-[#9697A2]">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Quiz
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Course
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Faculty
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Schedule
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-medium"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {quizzes.map((quiz, index) => (
                    <tr
                      key={quiz.id || `quiz-${index}`}
                      className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#EAEAE6]">
                          {quiz.title || "Untitled quiz"}
                        </p>

                        <p className="mt-1 max-w-xs truncate text-xs text-[#9697A2]">
                          {quiz.description || "No description provided"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-[#C7C7D0]">
                        <p>{getCourseName(quiz)}</p>

                        <p className="mt-1 text-xs text-[#9697A2]">
                          {getCourseCode(quiz) || "Course code unavailable"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-[#C7C7D0]">
                        {getFacultyName(quiz)}
                      </td>

                      <td className="px-4 py-4 text-sm text-[#C7C7D0]">
                        {getSchedule(quiz)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs ${getStatusStyles(quiz.status)}`}
                        >
                          {getStatusLabel(quiz.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-3">
                          <Link
                            to={`/hod/quizzes/details/${quiz.id}`}
                            state={{ quiz }}
                            className="rounded text-sm font-medium text-[#CDB5F7] transition hover:text-[#E0D0FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                          >
                            Details
                          </Link>

                          <Link
                            to={`/hod/quizzes/edit/${quiz.id}`}
                            state={{ quiz }}
                            className="rounded text-sm font-medium text-[#CDB5F7] transition hover:text-[#E0D0FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                          >
                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(quiz)}
                            disabled={Boolean(deletingId)}
                            className="rounded text-sm font-medium text-red-300 transition hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === quiz.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-[#343640] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#9697A2]">
                Showing {quizzes.length} of {pagination.total} quiz records
                <span className="mx-2">·</span>
                Page {pagination.page} of {pagination.pages}
              </p>

              <div className="flex items-center gap-2">
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.hasPreviousPage || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </ActionButton>

                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.hasNextPage || loading}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.pages, current + 1),
                    )
                  }
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