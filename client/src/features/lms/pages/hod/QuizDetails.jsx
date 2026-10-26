import { Link, useLocation } from "react-router-dom";

import ActionButton from "../../components/ActionButton.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#9697A2]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {value === undefined || value === null || value === ""
          ? "Not provided"
          : String(value)}
      </p>
    </div>
  );
}

export default function QuizDetails() {
  const location = useLocation();
  const quiz = location.state?.quiz;

  if (!quiz) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="ACADEMIC OVERSIGHT"
          title="Quiz Details"
          description="Review quiz scheduling, assessment information, and academic allocation."
          breadcrumbs={[
            { label: "HOD Dashboard", to: "/hod/dashboard" },
            { label: "Quizzes", to: "/hod/quizzes" },
            { label: "Details" },
          ]}
        />

        <SectionCard>
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#454650] bg-[#26272B] text-2xl text-[#CDB5F7]">
              !
            </div>

            <h2 className="text-lg font-semibold text-[#EAEAE6]">
              Quiz details unavailable
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-[#A5A6B0]">
              No quiz information was provided to this page. Open a quiz from
              the quiz overview when assessment records become available.
            </p>

            <div className="mt-6">
              <Link to="/hod/quizzes">
                <ActionButton variant="secondary">
                  Back to Quizzes
                </ActionButton>
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  const title = quiz.title || quiz.name || "Untitled Quiz";

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title={title}
        description="Review quiz information and its academic allocation."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod/dashboard" },
          { label: "Quizzes", to: "/hod/quizzes" },
          { label: "Details" },
        ]}
        actions={
          <Link to="/hod/quizzes">
            <ActionButton variant="secondary">
              Back to Quizzes
            </ActionButton>
          </Link>
        }
      />

      <SectionCard
        eyebrow="ASSESSMENT INFORMATION"
        title="Quiz Overview"
        description="Assessment information supplied by the selected quiz record."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="Quiz Title" value={title} />
          <DetailItem
            label="Course"
            value={quiz.courseName || quiz.course}
          />
          <DetailItem label="Course Code" value={quiz.courseCode} />
          <DetailItem
            label="Faculty"
            value={quiz.facultyName || quiz.faculty}
          />
          <DetailItem
            label="Batch"
            value={quiz.batchName || quiz.batch}
          />
          <DetailItem
            label="Section"
            value={quiz.sectionName || quiz.section}
          />
          <DetailItem label="Scheduled At" value={quiz.scheduledAt} />
          <DetailItem label="Duration" value={quiz.duration} />
          <DetailItem label="Status" value={quiz.status} />
          <DetailItem label="Total Marks" value={quiz.totalMarks} />
          <DetailItem label="Passing Marks" value={quiz.passingMarks} />
          <DetailItem label="Question Count" value={quiz.questionCount} />
        </div>
      </SectionCard>

      <div className="mt-6">
        <SectionCard
          eyebrow="INSTRUCTIONS"
          title="Quiz Instructions"
          description="Instructions supplied with the quiz record."
        >
          {quiz.instructions || quiz.description ? (
            <div className="whitespace-pre-wrap rounded-xl border border-[#343640] bg-[#191A21] p-4 text-sm leading-7 text-[#D0D0D8]">
              {quiz.instructions || quiz.description}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#454650] px-5 py-8 text-center">
              <p className="text-sm font-medium text-[#D0D0D8]">
                No instructions available
              </p>

              <p className="mt-2 text-sm text-[#9697A2]">
                Quiz instructions will appear here when provided.
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-5 rounded-xl border border-[#454650] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#E5DF98]">
          Backend integration pending
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          Quiz information currently comes from React Router navigation state.
          Opening this page directly or refreshing it may leave the details
          unavailable. This page does not modify or persist quiz records.
        </p>
      </div>
    </div>
  );
}