import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import facultyQuizResultDetailsService from '../../services/facultyQuizResultDetailsService.js';

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatNumber(value, suffix = '') {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return `${Number(number.toFixed(2))}${suffix}`;
}

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#9697A2]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium leading-6 text-[#EAEAE6]">
        {value === undefined || value === null || value === ''
          ? 'Not available'
          : String(value)}
      </p>
    </div>
  );
}

function getQuestionStatus(question) {
  if (question.isCorrect === true) {
    return {
      label: 'Correct',
      styles:
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    };
  }

  if (question.isCorrect === false) {
    return {
      label: 'Incorrect',
      styles: 'border-red-500/30 bg-red-500/10 text-red-300',
    };
  }

  return {
    label: 'Not evaluated',
    styles: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  };
}

function QuestionCard({ question, index }) {
  const status = getQuestionStatus(question);

  const options = Array.isArray(question.options)
    ? question.options
    : [];

  const selectedOptionIndex =
    question.selectedOptionIndex ?? null;

  const correctOptionIndex =
    question.correctOptionIndex ?? null;

  return (
    <article className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9697A2]">
            Question {index + 1}
          </p>

          <h3 className="mt-2 text-base font-semibold leading-7 text-[#EAEAE6]">
            {question.question || 'Question text unavailable'}
          </h3>
        </div>

        <span
          className={[
            'inline-flex shrink-0 rounded-full border px-3 py-1.5',
            'text-xs font-semibold',
            status.styles,
          ].join(' ')}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {options.map((option, optionIndex) => {
          const isSelected =
            selectedOptionIndex === optionIndex;

          const isCorrect =
            correctOptionIndex === optionIndex;

          let optionStyles =
            'border-[#343640] bg-[#202129] text-[#C8C8D0]';

          if (isCorrect) {
            optionStyles =
              'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
          } else if (isSelected) {
            optionStyles =
              'border-red-500/40 bg-red-500/10 text-red-200';
          }

          return (
            <div
              key={`${index}-${optionIndex}`}
              className={[
                'flex items-start gap-3 rounded-xl border p-3',
                optionStyles,
              ].join(' ')}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/20 text-xs font-semibold">
                {String.fromCharCode(65 + optionIndex)}
              </span>

              <span className="min-w-0 flex-1 pt-1 text-sm leading-6">
                {option}
              </span>

              {isCorrect && (
                <span className="shrink-0 text-xs font-semibold">
                  Correct answer
                </span>
              )}

              {!isCorrect && isSelected && (
                <span className="shrink-0 text-xs font-semibold">
                  Selected
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 border-t border-[#343640] pt-4 sm:grid-cols-3">
        <DetailItem
          label="Selected Option"
          value={
            selectedOptionIndex === null
              ? 'Not answered'
              : options[selectedOptionIndex]
          }
        />

        <DetailItem
          label="Correct Option"
          value={
            correctOptionIndex === null
              ? 'Not available'
              : options[correctOptionIndex]
          }
        />

        <DetailItem
          label="Marks Awarded"
          value={`${formatNumber(question.marksAwarded)} / ${formatNumber(question.marks)}`}
        />
      </div>
    </article>
  );
}

export default function FacultyQuizResultDetails() {
  const { attemptId } = useParams();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadResult() {
      setLoading(true);
      setError('');

      try {
        const response =
          await facultyQuizResultDetailsService.getResultDetails(
            attemptId,
          );

        if (isActive) {
          setResult(response);
        }
      } catch (requestError) {
        if (isActive) {
          setError(
            requestError?.message ||
              'Unable to load this quiz result. Please try again.',
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    if (attemptId) {
      loadResult();
    } else {
      setError('A valid quiz attempt ID is required.');
      setLoading(false);
    }

    return () => {
      isActive = false;
    };
  }, [attemptId]);

  const attempt = result?.attempt;
  const student = result?.student;
  const quiz = result?.quiz;
  const course = result?.course;
  const score = result?.score;

  const questions = Array.isArray(result?.questions)
    ? result.questions
    : [];

  const studentName =
    student?.fullName ||
    student?.name ||
    'Student';

  const quizTitle = quiz?.title || 'Quiz';

  const percentage = Number(score?.percentage);

  const validPercentage = Number.isFinite(percentage)
    ? percentage
    : null;

  const correctCount = questions.filter(
    (question) => question.isCorrect === true,
  ).length;

  const incorrectCount = questions.filter(
    (question) => question.isCorrect === false,
  ).length;

  const unansweredCount = questions.filter(
    (question) =>
      question.selectedOptionIndex === null ||
      question.selectedOptionIndex === undefined,
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Quiz Result Details"
        description="Review an individual student's submitted quiz attempt and question-wise performance."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'Quiz Results',
            to: '/faculty/quizzes/results',
          },
          {
            label: 'Result Details',
          },
        ]}
        actions={
          <Link
            to="/faculty/quizzes/results"
            className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            <ActionButton variant="secondary">
              Back to Results
            </ActionButton>
          </Link>
        }
      />

      {loading && (
        <SectionCard>
          <div className="flex items-center gap-3 py-8 text-sm text-[#9697A2]">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#CDB5F7] border-t-transparent" />
            Loading quiz result details...
          </div>
        </SectionCard>
      )}

      {!loading && error && (
        <SectionCard>
          <EmptyState
            title="Unable to load quiz result"
            description={error}
            action={
              <Link
                to="/faculty/quizzes/results"
                className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                <ActionButton variant="secondary">
                  Back to Quiz Results
                </ActionButton>
              </Link>
            }
          />
        </SectionCard>
      )}

      {!loading && !error && result && (
        <>
          <SectionCard
            eyebrow="STUDENT INFORMATION"
            title={studentName}
            description="Student and academic information associated with this submitted attempt."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DetailItem
                label="Student Name"
                value={studentName}
              />

              <DetailItem
                label="Student ID"
                value={
                  student?.institutionalId ||
                  student?.studentId
                }
              />

              <DetailItem
                label="Email"
                value={student?.email}
              />

              <DetailItem
                label="Course"
                value={course?.title || course?.name}
              />

              <DetailItem
                label="Course Code"
                value={course?.courseCode || course?.code}
              />

              <DetailItem
                label="Quiz"
                value={quizTitle}
              />
            </div>
          </SectionCard>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <section className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
              <p className="text-sm text-[#9697A2]">
                Score
              </p>

              <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">
                {formatNumber(score?.obtainedMarks)}{' '}
                <span className="text-lg text-[#9697A2]">
                  / {formatNumber(score?.totalMarks)}
                </span>
              </p>

              <p className="mt-2 text-xs text-[#777986]">
                Marks obtained
              </p>
            </section>

            <section className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
              <p className="text-sm text-[#9697A2]">
                Percentage
              </p>

              <p className="mt-3 text-3xl font-semibold text-[#CDB5F7]">
                {validPercentage === null
                  ? '—'
                  : `${formatNumber(validPercentage, '%')}`}
              </p>

              <p className="mt-2 text-xs text-[#777986]">
                Overall performance
              </p>
            </section>

            <section className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
              <p className="text-sm text-[#9697A2]">
                Correct Answers
              </p>

              <p className="mt-3 text-3xl font-semibold text-emerald-300">
                {correctCount}
              </p>

              <p className="mt-2 text-xs text-[#777986]">
                Correctly answered questions
              </p>
            </section>

            <section className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
              <p className="text-sm text-[#9697A2]">
                Incorrect Answers
              </p>

              <p className="mt-3 text-3xl font-semibold text-red-300">
                {incorrectCount}
              </p>

              <p className="mt-2 text-xs text-[#777986]">
                Unanswered: {unansweredCount}
              </p>
            </section>
          </div>

          <div className="mt-6">
            <SectionCard
              eyebrow="ATTEMPT INFORMATION"
              title="Submission Overview"
              description="Timing and status information for this quiz attempt."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <DetailItem
                  label="Attempt Status"
                  value={attempt?.status}
                />

                <DetailItem
                  label="Submitted At"
                  value={formatDate(attempt?.submittedAt)}
                />

                <DetailItem
                  label="Total Questions"
                  value={questions.length}
                />
              </div>
            </SectionCard>
          </div>

          <div className="mt-6">
            <SectionCard
              eyebrow="QUESTION-WISE EVALUATION"
              title="Answer Review"
              description="Compare the student's selected answers with the correct answers and review marks awarded."
            >
              {questions.length === 0 ? (
                <EmptyState
                  title="No question details available"
                  description="Question-wise evaluation data was not returned for this attempt."
                />
              ) : (
                <div className="space-y-5">
                  {questions.map((question, index) => (
                    <QuestionCard
                      key={question.questionId || index}
                      question={question}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}