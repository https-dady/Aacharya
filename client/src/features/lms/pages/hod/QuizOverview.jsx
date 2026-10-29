import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import ActionButton from "../../components/ActionButton.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import SectionCard from "../../components/SectionCard.jsx";

import quizManagementService from "../../services/quizManagementService.js";

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
  if (quiz.faculty && typeof quiz.faculty === "object") {
    return (
      quiz.faculty.name ||
      quiz.faculty.fullName ||
      quiz.faculty.email ||
      "—"
    );
  }

  return quiz.facultyName || quiz.faculty || "—";
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
  if (String(quiz.status).toUpperCase() === "CLOSED") {
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

export default function QuizOverview() {
  const [search, setSearch] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await quizManagementService.listQuizzes({
        page: 1,
        limit: 100,
      });

      setQuizzes(result.items);
    } catch (requestError) {
      setQuizzes([]);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes, refreshKey]);

  const filteredQuizzes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return quizzes;
    }

    return quizzes.filter((quiz) => {
      const courseName = getCourseName(quiz);
      const courseCode = getCourseCode(quiz);
      const facultyName = getFacultyName(quiz);

      const batchNames = Array.isArray(quiz.batches)
        ? quiz.batches
            .map((batch) =>
              typeof batch === "object"
                ? batch.name || batch.code || ""
                : batch,
            )
            .join(" ")
        : "";

      const sectionNames = Array.isArray(quiz.sections)
        ? quiz.sections
            .map((section) =>
              typeof section === "object"
                ? section.name || section.code || ""
                : section,
            )
            .join(" ")
        : "";

      return [
        quiz.title,
        quiz.description,
        courseName,
        courseCode,
        facultyName,
        batchNames,
        sectionNames,
        quiz.status,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query),
        );
    });
  }, [quizzes, search]);

  const summary = useMemo(() => {
    const now = new Date();

    return {
      total: quizzes.length,

      upcoming: quizzes.filter(
        (quiz) => getScheduleCategory(quiz, now) === "upcoming",
      ).length,

      published: quizzes.filter(
        (quiz) =>
          String(quiz.status).toUpperCase() === "PUBLISHED",
      ).length,

      completed: quizzes.filter(
        (quiz) => getScheduleCategory(quiz, now) === "completed",
      ).length,
    };
  }, [quizzes]);

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
          description="Quizzes scheduled for a future date"
        />

        <SummaryCard
          label="Published"
          value={loading ? "—" : summary.published}
          description="Quizzes marked as published"
        />

        <SummaryCard
          label="Completed"
          value={loading ? "—" : summary.completed}
          description="Quizzes whose scheduled window has ended"
        />
      </div>

      <SectionCard
        eyebrow="ASSESSMENT MANAGEMENT"
        title="Quiz Catalogue"
        description="Search and review quiz information returned by the backend."
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full max-w-xl">
            <SearchInput
              name="quizSearch"
              label="Search quizzes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, course, faculty, batch..."
            />
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] bg-[#26272B] px-4 py-2 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#343640] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-5"
          >
            <p className="text-sm font-medium text-red-300">
              Could not load quizzes
            </p>

            <p className="mt-2 text-sm leading-6 text-red-200/80">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="mt-4 rounded-lg border border-red-400/30 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/10"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <div
            role="status"
            className="rounded-xl border border-[#343640] bg-[#191A21] px-5 py-12 text-center"
          >
            <p className="text-sm text-[#C7C7D0]">
              Loading quiz records...
            </p>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <EmptyState
            title={
              search
                ? "No matching quizzes"
                : "No quiz records available"
            }
            description={
              search
                ? "Try another search term."
                : "No quizzes are currently available for your account."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
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

                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredQuizzes.map((quiz) => (
                  <tr
                    key={quiz.id}
                    className="border-b border-[#343640] last:border-0"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-[#EAEAE6]">
                        {quiz.title || "Untitled quiz"}
                      </p>

                      <p className="mt-1 text-xs text-[#9697A2]">
                        {getCourseCode(quiz) || "Course code unavailable"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-sm text-[#C7C7D0]">
                      {getCourseName(quiz)}
                    </td>

                    <td className="px-4 py-4 text-sm text-[#C7C7D0]">
                      {getFacultyName(quiz)}
                    </td>

                    <td className="px-4 py-4 text-sm text-[#C7C7D0]">
                      {getSchedule(quiz)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${getStatusStyles(quiz.status)}`}
                      >
                        {getStatusLabel(quiz.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <Link
                        to="/hod/quizzes/details"
                        state={{ quiz }}
                        className="rounded text-sm font-medium text-[#CDB5F7] transition hover:text-[#E0D0FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
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
    </div>
  );
}