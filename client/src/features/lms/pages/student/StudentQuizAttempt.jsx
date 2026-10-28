import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import studentQuizService from '../../services/studentQuizService.js';

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
}

function formatTime(milliseconds) {
  const totalSeconds = Math.max(
    0,
    Math.floor(milliseconds / 1000),
  );

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

function getRemainingMilliseconds(expiresAt) {
  if (!expiresAt) return 0;

  const expiryTime = new Date(expiresAt).getTime();

  if (Number.isNaN(expiryTime)) return 0;

  return Math.max(0, expiryTime - Date.now());
}

function getInitialAnswers(attempt) {
  const answers = {};

  for (const answer of attempt?.answers ?? []) {
    answers[answer.questionId] =
      answer.selectedOptionIndex ?? null;
  }

  return answers;
}

function getOptionText(option) {
  if (typeof option === 'string') {
    return option;
  }

  return option?.text ?? option?.label ?? '';
}

export default function StudentQuizAttempt() {
  const { quizId } = useParams();

  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [savingQuestionId, setSavingQuestionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [remainingMilliseconds, setRemainingMilliseconds] = useState(0);

  const saveQueueRef = useRef(Promise.resolve());
  const mountedRef = useRef(true);
  const answersRef = useRef({});

  const questions = attempt?.questions ?? [];

  const isInProgress = attempt?.status === 'IN_PROGRESS';
  const isSubmitted = attempt?.status === 'SUBMITTED';
  const isExpired = attempt?.status === 'EXPIRED';

  const currentQuestion = questions[currentQuestionIndex] ?? null;

  const answeredCount = questions.filter(
    (question) => answers[question.id] !== null
      && answers[question.id] !== undefined,
  ).length;

  const loadAttempt = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const result = await studentQuizService.startQuizAttempt(quizId);

      if (!mountedRef.current) return;

      setAttempt(result);

      const initialAnswers = getInitialAnswers(result);

      answersRef.current = initialAnswers;
      setAnswers(initialAnswers);

      setRemainingMilliseconds(
        getRemainingMilliseconds(result.expiresAt),
      );
    } catch (requestError) {
      if (mountedRef.current) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [quizId]);

  useEffect(() => {
    mountedRef.current = true;

    loadAttempt();

    return () => {
      mountedRef.current = false;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (!isInProgress || !attempt?.expiresAt) {
      return undefined;
    }

    const updateRemainingTime = () => {
      setRemainingMilliseconds(
        getRemainingMilliseconds(attempt.expiresAt),
      );
    };

    updateRemainingTime();

    const intervalId = window.setInterval(
      updateRemainingTime,
      1000,
    );

    return () => window.clearInterval(intervalId);
  }, [attempt?.expiresAt, isInProgress]);

  async function handleAnswerChange(question, selectedOptionIndex) {
    if (!isInProgress || savingQuestionId || submitting) {
      return;
    }

    if (getRemainingMilliseconds(attempt?.expiresAt) <= 0) {
      setError('Time is over. Reload the attempt to check its final status.');
      return;
    }

    const questionId = question.id;

    setError('');
    setNotice('');
    setSavingQuestionId(questionId);

    const updatedAnswers = {
      ...answersRef.current,
      [questionId]: selectedOptionIndex,
    };

    answersRef.current = updatedAnswers;
    setAnswers(updatedAnswers);

    // Queue saves so rapid changes cannot complete out of order.
    const saveOperation = saveQueueRef.current.then(async () => {
      return studentQuizService.saveQuizAnswer({
        attemptId: attempt.id,
        questionId,
        selectedOptionIndex,
      });
    });

    saveQueueRef.current = saveOperation.catch(() => {});

    try {
      await saveOperation;

      if (mountedRef.current) {
        setNotice('Answer saved.');
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setError(
          `${getErrorMessage(requestError)} Your latest selection may not have been saved.`,
        );
      }
    } finally {
      if (mountedRef.current) {
        setSavingQuestionId('');
      }
    }
  }

  async function handleSubmit() {
    if (!attempt?.id || !isInProgress || submitting) {
      return;
    }

    const confirmed = window.confirm(
      'Submit this quiz now? You will not be able to change answers after submission.',
    );

    if (!confirmed) return;

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      // Wait for pending answer saves before submitting.
      await saveQueueRef.current;

      const result = await studentQuizService.submitQuizAttempt(
        attempt.id,
      );

      if (!mountedRef.current) return;

      setAttempt(result);
      setNotice('Quiz submitted successfully.');
    } catch (requestError) {
      if (mountedRef.current) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1100px]">
        <PageHeader
          eyebrow="STUDENT WORKSPACE"
          title="Loading Quiz"
          description="Preparing your quiz attempt."
          breadcrumbs={[
            { label: 'Dashboard', to: '/student/dashboard' },
            { label: 'Quizzes', to: '/student/quizzes' },
            { label: 'Attempt' },
          ]}
        />

        <div
          className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-8 text-center"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#454650] border-t-[#CDB5F7]" />

          <p className="mt-4 text-sm text-[#A5A6B0]">
            Loading your quiz and saved answers...
          </p>
        </div>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="mx-auto w-full max-w-[1100px]">
        <PageHeader
          eyebrow="STUDENT WORKSPACE"
          title="Quiz Unavailable"
          description="We could not start or resume this quiz attempt."
          breadcrumbs={[
            { label: 'Dashboard', to: '/student/dashboard' },
            { label: 'Quizzes', to: '/student/quizzes' },
          ]}
        />

        <SectionCard title="Unable to load quiz">
          <div
            role="alert"
            className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-300"
          >
            {error}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadAttempt}
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

  if (!attempt) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title={attempt.quiz?.title || 'Quiz Attempt'}
        description={
          attempt.quiz?.description ||
          'Answer each question and submit your attempt before time expires.'
        }
        breadcrumbs={[
          { label: 'Dashboard', to: '/student/dashboard' },
          { label: 'Quizzes', to: '/student/quizzes' },
          { label: 'Attempt' },
        ]}
      />

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-300"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300"
        >
          {notice}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">Time remaining</p>

          <p
            className={[
              'mt-3 font-mono text-2xl font-semibold',
              remainingMilliseconds <= 60000 && isInProgress
                ? 'text-red-300'
                : 'text-[#E5DF98]',
            ].join(' ')}
            aria-live="off"
          >
            {isInProgress
              ? formatTime(remainingMilliseconds)
              : '—'}
          </p>

          {remainingMilliseconds <= 0 && isInProgress && (
            <p className="mt-2 text-xs text-red-300">
              Time limit reached. Reload to check the attempt status.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">Questions answered</p>

          <p className="mt-3 text-2xl font-semibold text-[#CDB5F7]">
            {answeredCount}
            <span className="text-base font-medium text-[#777884]">
              {' '}/ {questions.length}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">Total marks</p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {attempt.totalMarks}
          </p>
        </div>
      </section>

      {isSubmitted && (
        <SectionCard
          title="Quiz Submitted"
          description="Your answers have been submitted and scored by the server."
          variant="contrast"
        >
          <p className="text-sm text-[#A5A6B0]">
            Your score
          </p>

          <p className="mt-2 text-3xl font-semibold text-[#CDB5F7]">
            {attempt.score ?? '—'}
            <span className="ml-2 text-base font-medium text-[#777884]">
              / {attempt.totalMarks}
            </span>
          </p>

          <p className="mt-3 text-sm text-[#A5A6B0]">
            Submitted:{' '}
            {attempt.submittedAt
              ? new Date(attempt.submittedAt).toLocaleString('en-IN')
              : 'Not available'}
          </p>
        </SectionCard>
      )}

      {isExpired && (
        <SectionCard
          title="Attempt Expired"
          description="The allowed time for this attempt has ended."
        >
          <p className="text-sm leading-6 text-[#A5A6B0]">
            This attempt is no longer editable. If you need help,
            contact your faculty or academic administrator.
          </p>
        </SectionCard>
      )}

      {questions.length === 0 ? (
        <SectionCard title="Questions">
          <EmptyState
            title="No questions available"
            description="The server did not return questions for this attempt."
          />
        </SectionCard>
      ) : (
        <SectionCard
          eyebrow={`QUESTION ${currentQuestionIndex + 1} OF ${questions.length}`}
          title="Your Questions"
          description="Select one option for each question. Your selection is saved to the server."
          action={
            <span className="rounded-lg border border-[#454650] px-3 py-1.5 text-xs font-medium text-[#A5A6B0]">
              {answeredCount} answered
            </span>
          }
        >
          <div className="mb-6 flex flex-wrap gap-2">
            {questions.map((question, index) => {
              const isAnswered =
                answers[question.id] !== null &&
                answers[question.id] !== undefined;

              const isCurrent = index === currentQuestionIndex;

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(index)}
                  aria-label={`Go to question ${index + 1}${isAnswered ? ', answered' : ', unanswered'}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={[
                    'flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold transition',
                    isCurrent
                      ? 'border-[#CDB5F7] bg-[#CDB5F7] text-[#14161C]'
                      : isAnswered
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                        : 'border-[#454650] bg-[#191A21] text-[#A5A6B0] hover:border-[#CDB5F7]/50',
                  ].join(' ')}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          {currentQuestion && (
            <div className="rounded-2xl border border-[#343640] bg-[#191A21] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#CDB5F7]">
                  Question {currentQuestionIndex + 1}
                </p>

                <span className="rounded-lg border border-[#454650] px-2.5 py-1 text-xs text-[#A5A6B0]">
                  {currentQuestion.marks} marks
                </span>
              </div>

              <h2 className="mt-4 whitespace-pre-wrap text-lg font-semibold leading-7 text-[#EAEAE6]">
                {currentQuestion.questionText}
              </h2>

              <fieldset
                disabled={!isInProgress || submitting || remainingMilliseconds <= 0}
                className="mt-6 space-y-3 disabled:opacity-70"
              >
                <legend className="mb-3 text-sm text-[#A5A6B0]">
                  Choose one answer
                </legend>

                {currentQuestion.options.map((option, optionIndex) => {
                  const selected =
                    answers[currentQuestion.id] === optionIndex;

                  return (
                    <label
                      key={`${currentQuestion.id}-${optionIndex}`}
                      className={[
                        'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition',
                        selected
                          ? 'border-[#CDB5F7]/60 bg-[#CDB5F7]/10'
                          : 'border-[#343640] bg-[#1D1F27] hover:border-[#454650]',
                        !isInProgress || submitting || remainingMilliseconds <= 0
                          ? 'cursor-not-allowed'
                          : '',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={optionIndex}
                        checked={selected}
                        onChange={() => handleAnswerChange(
                          currentQuestion,
                          optionIndex,
                        )}
                        className="mt-1 h-4 w-4 accent-[#CDB5F7]"
                      />

                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#454650] text-xs font-semibold text-[#CDB5F7]">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>

                      <span className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-6 text-[#EAEAE6]">
                        {getOptionText(option)}
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              {savingQuestionId === currentQuestion.id && (
                <p
                  className="mt-4 text-xs text-[#E5DF98]"
                  role="status"
                >
                  Saving answer...
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-5">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(
                    (index) => Math.max(0, index - 1),
                  )}
                  className="rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#252630] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={currentQuestionIndex >= questions.length - 1}
                  onClick={() => setCurrentQuestionIndex(
                    (index) => Math.min(questions.length - 1, index + 1),
                  )}
                  className="rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#14161C] transition hover:bg-[#D9C8FA] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next Question
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {isInProgress && (
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-[#EAEAE6]">
              Ready to submit?
            </p>

            <p className="mt-1 text-sm text-[#A5A6B0]">
              {questions.length - answeredCount} unanswered question(s) remain.
              You can review them before submitting.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || savingQuestionId !== ''}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#E5DF98] px-5 py-2.5 text-sm font-semibold text-[#14161C] transition hover:bg-[#EEE9AE] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          to="/student/quizzes"
          className="inline-flex items-center justify-center rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#252630]"
        >
          Back to Quizzes
        </Link>

        {isSubmitted && (
          <Link
            to="/student/results"
            className="inline-flex items-center justify-center rounded-xl border border-[#CDB5F7]/30 px-4 py-2.5 text-sm font-medium text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10"
          >
            View Results
          </Link>
        )}
      </div>
    </div>
  );
}