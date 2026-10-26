import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../../../components/common/PageHeader";
import SectionCard from "../../../../components/common/SectionCard";
import SearchInput from "../../../../components/common/SearchInput";
import EmptyState from "../../../../components/common/EmptyState";
import ActionButton from "../../../../components/common/ActionButton";

const quizzes = [];

function SummaryCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

export default function QuizOverview() {
  const [search, setSearch] = useState("");

  const filteredQuizzes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return quizzes;

    return quizzes.filter((quiz) =>
      [
        quiz.title,
        quiz.course,
        quiz.courseCode,
        quiz.faculty,
        quiz.batch,
        quiz.section,
        quiz.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Management"
        title="Quiz Overview"
        description="Review quizzes across courses, monitor scheduling, and oversee academic assessments."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod" },
          { label: "Quizzes" },
        ]}
        actions={
          <Link to="/hod/courses">
            <ActionButton variant="secondary">View Courses</ActionButton>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Quizzes"
          value="—"
          description="Quizzes across assigned academic courses"
        />
        <SummaryCard
          label="Upcoming"
          value="—"
          description="Quizzes scheduled for a future date"
        />
        <SummaryCard
          label="Published"
          value="—"
          description="Quizzes currently available to students"
        />
        <SummaryCard
          label="Completed"
          value="—"
          description="Quizzes whose scheduled window has ended"
        />
      </div>

      <SectionCard
        title="Quiz Catalogue"
        description="Search and review quiz information when records become available."
      >
        <div className="mb-5">
          <SearchInput
            name="quizSearch"
            label="Search quizzes"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, course, faculty, batch..."
          />
        </div>

        {filteredQuizzes.length === 0 ? (
          <EmptyState
            title={search ? "No matching quizzes" : "No quiz records available"}
            description={
              search
                ? "Try another search term."
                : "Quiz records will appear here once the assessment data is connected."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-medium">Quiz</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Faculty</th>
                  <th className="px-4 py-3 font-medium">Schedule</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredQuizzes.map((quiz) => (
                  <tr
                    key={quiz.id}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-200">
                        {quiz.title || "Untitled quiz"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {quiz.courseCode || "Course code unavailable"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-300">
                      {quiz.course || "—"}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-300">
                      {quiz.faculty || "—"}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-300">
                      {quiz.scheduledAt || "Not scheduled"}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                        {quiz.status || "Unspecified"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <Link
                        to="/hod/quizzes/details"
                        state={{ quiz }}
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
          Quiz records and summary counts are not connected to a backend yet.
          This page does not create, publish, or modify quizzes.
        </p>
      </div>
    </div>
  );
}