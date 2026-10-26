import { Link, useLocation } from "react-router-dom";
import PageHeader from "../../../../components/common/PageHeader";
import SectionCard from "../../../../components/common/SectionCard";
import ActionButton from "../../../../components/common/ActionButton";

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-200">
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
      <div className="space-y-6">
        <PageHeader
          eyebrow="Academic Management"
          title="Quiz Details"
          description="Review quiz scheduling, assessment information, and academic allocation."
          breadcrumbs={[
            { label: "HOD Dashboard", to: "/hod" },
            { label: "Quizzes", to: "/hod/quizzes" },
            { label: "Details" },
          ]}
        />

        <SectionCard>
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl text-slate-400">
              !
            </div>

            <h2 className="text-lg font-semibold text-white">
              Quiz details unavailable
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Management"
        title={title}
        description="Review quiz information and its academic allocation."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod" },
          { label: "Quizzes", to: "/hod/quizzes" },
          { label: "Details" },
        ]}
        actions={
          <Link to="/hod/quizzes">
            <ActionButton variant="secondary">Back to Quizzes</ActionButton>
          </Link>
        }
      />

      <SectionCard
        title="Quiz Overview"
        description="Assessment information supplied by the previous page."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="Quiz Title" value={title} />
          <DetailItem label="Course" value={quiz.course} />
          <DetailItem label="Course Code" value={quiz.courseCode} />
          <DetailItem label="Faculty" value={quiz.faculty} />
          <DetailItem label="Batch" value={quiz.batch} />
          <DetailItem label="Section" value={quiz.section} />
          <DetailItem label="Scheduled At" value={quiz.scheduledAt} />
          <DetailItem label="Duration" value={quiz.duration} />
          <DetailItem label="Status" value={quiz.status} />
          <DetailItem label="Total Marks" value={quiz.totalMarks} />
          <DetailItem label="Passing Marks" value={quiz.passingMarks} />
          <DetailItem label="Question Count" value={quiz.questionCount} />
        </div>
      </SectionCard>

      <SectionCard
        title="Instructions"
        description="Instructions provided for the quiz."
      >
        {quiz.instructions || quiz.description ? (
          <div className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300">
            {quiz.instructions || quiz.description}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-300">
              No instructions available
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Quiz instructions will appear here when provided.
            </p>
          </div>
        )}
      </SectionCard>

      <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
        <p className="text-sm font-medium text-amber-200">
          Frontend integration pending
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          Quiz information currently comes from React Router navigation state.
          Opening this page directly or refreshing it may leave the details
          unavailable. Persistent records and backend integration will be
          handled during the integration phase.
        </p>
      </div>
    </div>
  );
}