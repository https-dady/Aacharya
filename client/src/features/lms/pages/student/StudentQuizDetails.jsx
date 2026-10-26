import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";

export default function StudentQuizDetails() {
  const { quizId } = useParams();

  // Quiz data will be connected to the backend later.
  const quiz = null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quiz Details"
        description="Review quiz information, instructions, and attempt availability."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/student/quizzes"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <span aria-hidden="true">←</span>
          Back to Quizzes
        </Link>

        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          Awaiting quiz data
        </span>
      </div>

      <SectionCard
        title="Quiz Overview"
        description="Quiz reference and assessment information."
      >
        {quiz ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {quiz.title}
              </h2>

              {quiz.description && (
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {quiz.description}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem
                label="Duration"
                value={
                  Number.isFinite(quiz.durationMinutes)
                    ? `${quiz.durationMinutes} minutes`
                    : "Not specified"
                }
              />

              <DetailItem
                label="Total marks"
                value={
                  Number.isFinite(quiz.totalMarks)
                    ? String(quiz.totalMarks)
                    : "Not specified"
                }
              />

              <DetailItem
                label="Attempts allowed"
                value={
                  Number.isFinite(quiz.attemptsAllowed)
                    ? String(quiz.attemptsAllowed)
                    : "Not specified"
                }
              />

              <DetailItem
                label="Availability"
                value={quiz.status || "Not specified"}
              />
            </div>
          </div>
        ) : (
          <EmptyState
            title="Quiz information is not available yet"
            description="The quiz record, schedule, duration, and assessment details will appear here when the quiz data is connected."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Instructions"
        description="Review the assessment rules before starting an attempt."
      >
        {quiz?.instructions ? (
          <div className="whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
            {quiz.instructions}
          </div>
        ) : (
          <EmptyState
            title="Instructions pending"
            description="The faculty-provided quiz instructions will appear here when available."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Attempt Status"
        description="Your attempt eligibility and submission status."
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {quiz ? "Attempt information" : "Attempt unavailable"}
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {quiz
                ? "Attempt eligibility will be determined from the quiz schedule, availability, and your recorded attempts."
                : "You cannot start an attempt until the quiz information and eligibility have been verified."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/student/quizzes"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Browse Quizzes
            </Link>

            <Link
              to="/student/results"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              View Results
            </Link>
          </div>
        </div>
      </SectionCard>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Quiz reference: {quizId}
      </p>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}