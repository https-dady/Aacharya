import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";

const ACADEMIC_SECTIONS = [
  {
    id: "attendance",
    title: "Attendance Overview",
    description: "Review your attendance percentage and attendance records.",
    path: "/student/attendance",
    icon: "◷",
  },
  {
    id: "courses",
    title: "Course Overview",
    description: "View your enrolled courses and available learning materials.",
    path: "/student/courses",
    icon: "▤",
  },
  {
    id: "assignments",
    title: "Assignment Status",
    description: "Review assignments, deadlines, and submission status.",
    path: "/student/assignments",
    icon: "✓",
  },
  {
    id: "quizzes",
    title: "Quiz Overview",
    description: "Review available quizzes and your assessment activity.",
    path: "/student/quizzes",
    icon: "◇",
  },
  {
    id: "results",
    title: "Results Summary",
    description: "Access your published assessment results and marks.",
    path: "/student/results",
    icon: "↗",
  },
];

export default function StudentAcademicOverview() {
  const [searchQuery, setSearchQuery] = useState("");

  // API integration pending. No fabricated academic metrics or records.
  const academicData = {
    attendance: null,
    courses: [],
    assignments: [],
    quizzes: [],
    results: [],
  };

  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return ACADEMIC_SECTIONS;

    return ACADEMIC_SECTIONS.filter(
      (section) =>
        section.title.toLowerCase().includes(query) ||
        section.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const summaryItems = [
    {
      label: "Attendance",
      value:
        academicData.attendance?.percentage != null
          ? `${academicData.attendance.percentage}%`
          : "—",
      detail: "Attendance percentage",
      path: "/student/attendance",
    },
    {
      label: "Courses",
      value:
        academicData.courses.length > 0
          ? academicData.courses.length
          : "—",
      detail: "Enrolled courses",
      path: "/student/courses",
    },
    {
      label: "Assignments",
      value:
        academicData.assignments.length > 0
          ? academicData.assignments.length
          : "—",
      detail: "Available assignments",
      path: "/student/assignments",
    },
    {
      label: "Quizzes",
      value:
        academicData.quizzes.length > 0
          ? academicData.quizzes.length
          : "—",
      detail: "Available quizzes",
      path: "/student/quizzes",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student Workspace"
        title="Academic Overview"
        description="A consolidated view of your attendance, courses, assignments, quizzes, and results."
        breadcrumbs={[
          { label: "Student", to: "/student/dashboard" },
          { label: "Academic Overview" },
        ]}
      />

      <SectionCard
        title="Academic Summary"
        description="Your academic metrics will appear here when available."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className="rounded-xl border border-[#343640] bg-[#26272B] p-4 transition hover:border-[#CDB5F7]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            >
              <p className="text-sm text-[#A5A6B0]">{item.label}</p>

              <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">
                {item.value}
              </p>

              <p className="mt-2 text-xs text-[#777985]">{item.detail}</p>
            </Link>
          ))}
        </div>

        <p className="mt-4 text-xs leading-5 text-[#777985]">
          A dash indicates that data is not currently available. It does not
          represent zero or a failed result.
        </p>
      </SectionCard>

      <SectionCard
        title="Academic Activities"
        description="Choose an area to view its detailed academic information."
      >
        <div>
          <label
            htmlFor="academic-overview-search"
            className="mb-2 block text-sm font-medium text-[#EAEAE6]"
          >
            Find an academic section
          </label>

          <input
            id="academic-overview-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search attendance, courses, assignments..."
            className="w-full rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6] placeholder:text-[#777985] focus:border-[#CDB5F7] focus:outline-none focus:ring-2 focus:ring-[#CDB5F7]/20"
          />
        </div>

        <div className="mt-5">
          {filteredSections.length === 0 ? (
            <EmptyState
              title="No matching academic sections"
              description="Try a different search term."
              icon="⌕"
              action={
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                >
                  Clear search
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredSections.map((section) => (
                <article
                  key={section.id}
                  className="flex flex-col rounded-xl border border-[#343640] bg-[#26272B] p-5"
                >
                  <div className="flex items-start gap-3">
                    <div
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#CDB5F7]/10 text-lg text-[#CDB5F7]"
                    >
                      {section.icon}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#EAEAE6]">
                        {section.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[#343640] pt-4">
                    <Link
                      to={section.path}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                    >
                      View details
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Assessment Results"
        description="Review published results through your results page."
      >
        {academicData.results.length === 0 ? (
          <EmptyState
            title="No result data available"
            description="Published assessment results will be reflected in your academic overview when the data is connected."
            icon="↗"
            action={
              <Link
                to="/student/results"
                className="inline-flex rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                Open My Results
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {academicData.results.map((result) => (
              <div
                key={result.id}
                className="rounded-xl border border-[#343640] bg-[#26272B] p-4"
              >
                <p className="font-medium text-[#EAEAE6]">{result.title}</p>
                <p className="mt-1 text-sm text-[#A5A6B0]">
                  {result.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}