import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import studentQuizService from '../../services/studentQuizService.js';

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Unable to load quiz details. Please try again.'
  );
}

function formatDate(value) {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not specified';
  }

  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getStatusLabel(status) {
  const labels = {
    available: 'Available',
    upcoming: 'Upcoming',
    closed: 'Closed',
    in_progress: 'In Progress',
    submitted: 'Submitted',
  };

  return labels[status] || 'Unavailable';
}

function getStatusClasses(status) {
  if (status === 'available') {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
  }

  if (status === 'upcoming') {
    return 'border-[#E5DF98]/30 bg-[#E5DF98]/10 text-[#E5DF98]';
  }

  return 'border-[#454650] bg-[#252630] text-[#A5A6B0]';
}

export default function StudentQuizDetails() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await studentQuizService.getMyQuizById(quizId);

      setQuiz(result);

      if (!result) {
        setError(
          'This quiz is not available in your student quiz list.',
        );
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  function handleStartQuiz() {
    if (!quiz?.id || quiz.status !== 'available') {
      return;
    }

    navigate(`/student/quizzes/${quiz.id}/attempt`);
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1100px]">
        <PageHeader
          eyebrow="STUDENT WORKSPACE"
          title="Quiz Details"
          description="Loading quiz information."
          breadcrumbs={[
            { label: 'Dashboard', to: '/student/dashboard' },
            { label: 'Quizzes', to: '/student/quizzes' },
            { label: 'Details' },
          ]}
        />

        <div
          className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-8 text-center"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#454650] border-t-[#CDB5F7]" />

          <p className="mt-4 text-sm text-[#A5A6B0]">
            Fetching quiz details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="mx-auto w-full max-w-[1100px]">
        <PageHeader
          eyebrow="STUDENT WORKSPACE"
          title="Quiz Details"
          description="We could not load this quiz."
          breadcrumbs={[
            { label: 'Dashboard', to: '/student/dashboard' },
            { label: 'Quizzes', to: '/student/quizzes' },
          ]}
        />

        <SectionCard title="Quiz unavailable">
          <EmptyState
            title="Quiz not found"
            description={
              error ||
              'This quiz is not currently available to your account.'
            }
          />

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadQuiz}
              className="rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#14161C] transition hover:bg-[#D9C8FA]"
            >
              Try Again
            </button>

            <Link
              to="/student/quizzes"
              className="rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#252630]"
            >
              Back to Quizzes
            </Link>
          </div>
        </SectionCard>
      </div>
    );
  }

  const canStart = quiz.status === 'available';

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title={quiz.title}
        description={
          quiz.description ||
          'Review the quiz information before starting your attempt.'
        }
        breadcrumbs={[
          { label: 'Dashboard', to: '/student/dashboard' },
          { label: 'Quizzes', to: '/student/quizzes' },
          { label: 'Details' },
        ]}
      />

      <SectionCard
        title="Quiz Overview"
        description="Review the schedule and assessment details."
        action={
          <span
            className={[
              'inline-flex rounded-lg border px-3 py-1.5 text-xs font-semibold',
              getStatusClasses(quiz.status),
            ].join(' ')}
          >
            {getStatusLabel(quiz.status)}
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-sm text-[#A5A6B0]">Course</p>

            <p className="mt-2 font-semibold text-[#EAEAE6]">
              {quiz.courseName || 'Not specified'}
            </p>

            {quiz.courseCode && (
              <p className="mt-1 text-xs text-[#777884]">
                {quiz.courseCode}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-sm text-[#A5A6B0]">Duration</p>

            <p className="mt-2 font-semibold text-[#EAEAE6]">
              {quiz.durationMinutes > 0
                ? `${quiz.durationMinutes} minutes`
                : 'Not specified'}
            </p>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-sm text-[#A5A6B0]">Total Marks</p>

            <p className="mt-2 font-semibold text-[#EAEAE6]">
              {Number.isFinite(quiz.totalMarks)
                ? quiz.totalMarks
                : 'Not specified'}
            </p>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-sm text-[#A5A6B0]">Starts At</p>

            <p className="mt-2 text-sm font-medium leading-6 text-[#EAEAE6]">
              {formatDate(quiz.startAt)}
            </p>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-sm text-[#A5A6B0]">Ends At</p>

            <p className="mt-2 text-sm font-medium leading-6 text-[#EAEAE6]">
              {formatDate(quiz.endAt)}
            </p>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-sm text-[#A5A6B0]">Assessment Type</p>

            <p className="mt-2 font-semibold text-[#EAEAE6]">
              Multiple Choice
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Before You Begin"
        description="Keep these points in mind during your attempt."
      >
        <ul className="space-y-3 text-sm leading-6 text-[#A5A6B0]">
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CDB5F7]" />
            Your attempt timer starts when the server creates your attempt.
          </li>

          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CDB5F7]" />
            Your answers are saved through the quiz API.
          </li>

          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CDB5F7]" />
            After submission, the server calculates your score.
          </li>

          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CDB5F7]" />
            If you already have an active attempt, the server may resume it.
          </li>
        </ul>
      </SectionCard>

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 sm:flex-row sm:items-center">
        <div>
          <p className="font-semibold text-[#EAEAE6]">
            {canStart ? 'Ready to begin?' : 'Quiz not available yet'}
          </p>

          <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
            {canStart
              ? 'Start your attempt when you are ready.'
              : quiz.status === 'upcoming'
                ? 'You can start when the quiz availability window opens.'
                : 'The quiz is not currently available for a new attempt.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartQuiz}
          disabled={!canStart}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#CDB5F7] px-5 py-2.5 text-sm font-semibold text-[#14161C] transition hover:bg-[#D9C8FA] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start Quiz
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/student/quizzes"
          className="inline-flex items-center rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#252630]"
        >
          Back to Quizzes
        </Link>

        <Link
          to="/student/results"
          className="inline-flex items-center rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#252630]"
        >
          View Results
        </Link>
      </div>
    </div>
  );
}