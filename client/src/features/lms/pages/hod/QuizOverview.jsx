import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import ActionButton from "../../components/ActionButton.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import SectionCard from "../../components/SectionCard.jsx";

// Real quiz records will be connected during backend integration.
const quizzes = [];

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

export default function QuizOverview() {
  const [search, setSearch] = useState("");

  const filteredQuizzes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return quizzes;
    }

    return quizzes.filter((quiz) =>
      [
        quiz.title,
        quiz.course,
        quiz.courseName,
        quiz.courseCode,
        quiz.faculty,
        quiz.facultyName,
        quiz.batch,
        quiz.section,
        quiz.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [search]);

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
          <Link to="/hod/courses">
            <ActionButton variant="secondary">
              View Courses
            </ActionButton>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Quizzes"
          value="—"
          description="Quizzes across academic courses"
        />

        <SummaryCard
          label="Upcoming"
          value="—"
          description="Quizzes scheduled for a future date"
        />

        <SummaryCard
          label="Published"
          value="—"
          description="Quizzes available to students"
        />

        <SummaryCard
          label="Completed"
          value="—"
          description="Quizzes whose scheduled window has ended"
        />
      </div>

      <SectionCard
        eyebrow="ASSESSMENT MANAGEMENT"
        title="Quiz Catalogue"
        description="Search and review quiz information when records become available."
      >
        <div className="mb-5 max-w-xl">
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
            title={
              search
                ? "No matching quizzes"
                : "No quiz records available"
            }
            description={
              search
                ? "Try another search term."
                : "Quiz records will appear here once assessment data is connected."
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
                        {quiz.title || quiz.name || "Untitled quiz"}
                      </p>

                      <p className="mt-1 text-xs text-[#9697A2]">
                        {quiz.courseCode || "Course code unavailable"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-sm text-[#C7C7D0]">
                      {quiz.courseName || quiz.course || "—"}
                    </td>

                    <td className="px-4 py-4 text-sm text-[#C7C7D0]">
                      {quiz.facultyName || quiz.faculty || "—"}
                    </td>

                    <td className="px-4 py-4 text-sm text-[#C7C7D0]">
                      {quiz.scheduledAt || "Not scheduled"}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full border border-[#454650] bg-[#26272B] px-3 py-1 text-xs text-[#D0D0D8]">
                        {quiz.status || "Unspecified"}
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

      <div className="rounded-xl border border-[#454650] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#E5DF98]">
          Backend integration pending
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          Quiz records and summary counts are not connected to a backend yet.
          This page does not create, publish, or modify quizzes.
        </p>
      </div>
    </div>
  );
}