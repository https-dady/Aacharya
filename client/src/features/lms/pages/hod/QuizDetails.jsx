import { Link, useLocation } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function getId(value) {
  if (!value) return '';

  if (typeof value === 'string') return value;

  return String(value.id ?? value._id ?? '');
}

function getLabel(value, fallback = 'Not provided') {
  if (!value) return fallback;

  if (typeof value === 'string') return value;

  return (
    value.name
    || value.title
    || value.fullName
    || value.code
    || getId(value)
    || fallback
  );
}

function formatDate(value) {
  if (!value) return 'Not provided';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not provided';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getStatusStyles(status) {
  switch (String(status || 'DRAFT').toUpperCase()) {
    case 'PUBLISHED':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case 'CLOSED':
      return 'border-[#CDB5F7]/30 bg-[#CDB5F7]/10 text-[#D8CBFF]';

    default:
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  }
}

function DetailItem({ label, value, children }) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#9697A2]">
        {label}
      </p>

      <div className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {children ?? (
          value === undefined || value === null || value === ''
            ? 'Not provided'
            : String(value)
        )}
      </div>
    </div>
  );
}

function RecordList({ items, label }) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <p className="text-sm text-[#9697A2]">
        No {label.toLowerCase()} assigned.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span
          key={getId(item) || `${label}-${index}`}
          className="rounded-lg border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#D0D0D8]"
        >
          {getLabel(item, `${label} ${index + 1}`)}
        </span>
      ))}
    </div>
  );
}

function QuestionCard({ question, index }) {
  const options = Array.isArray(question.options)
    ? question.options
    : [];

  const correctOptionIndex = Number(question.correctOptionIndex);

  return (
    <div className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#CDB5F7]">
            Question {index + 1}
          </p>

          <h3 className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#EAEAE6]">
            {question.question || 'Question text unavailable'}
          </h3>
        </div>

        <span className="shrink-0 rounded-lg border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-3 py-1.5 text-xs font-semibold text-[#CDB5F7]">
          {question.marks ?? 0} Marks
        </span>
      </div>

      <div className="mt-5 space-y-2">
        {options.map((option, optionIndex) => {
          const isCorrect = optionIndex === correctOptionIndex;

          return (
            <div
              key={`question-${index}-option-${optionIndex}`}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                isCorrect
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-[#343640] bg-[#20212A]'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isCorrect
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-[#343640] text-[#A5A6B0]'
                }`}
              >
                {String.fromCharCode(65 + optionIndex)}
              </span>

              <p className="flex-1 break-words text-sm text-[#D0D0D8]">
                {option}
              </p>

              {isCorrect && (
                <span className="shrink-0 text-xs font-semibold text-emerald-300">
                  Correct Answer
                </span>
              )}
            </div>
          );
        })}
      </div>

      {options.length === 0 && (
        <p className="mt-3 text-sm text-[#9697A2]">
          No answer options available.
        </p>
      )}
    </div>
  );
}

export default function QuizDetails() {
  const location = useLocation();

  const quiz = location.state?.quiz;

  if (!quiz) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <PageHeader
          eyebrow="ACADEMIC MANAGEMENT"
          title="Quiz Details"
          description="Review assessment information, scheduling and questions."
          breadcrumbs={[
            { label: 'HOD Dashboard', to: '/hod/dashboard' },
            { label: 'Quizzes', to: '/hod/quizzes' },
            { label: 'Details' },
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
              No quiz record was supplied to this page. Open the quiz
              from the quiz overview to view its details.

              The current backend does not provide a GET-by-ID endpoint,
              so refreshing this page may also require reopening the record.
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

  const title = quiz.title || 'Untitled Quiz';

  const course = quiz.course;
  const department = quiz.department;
  const creator = quiz.createdBy;

  const batches = quiz.batches ?? quiz.batchIds ?? [];
  const sections = quiz.sections ?? quiz.sectionIds ?? [];

  const questions = Array.isArray(quiz.questions)
    ? quiz.questions
    : [];

  const totalMarks = Number(
    quiz.totalMarks
    ?? questions.reduce(
      (total, question) => total + Number(question.marks || 0),
      0,
    ),
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="ACADEMIC MANAGEMENT"
        title={title}
        description="Review complete quiz information, academic allocation and assessment questions."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Quizzes', to: '/hod/quizzes' },
          { label: 'Details' },
        ]}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link
              to="/hod/quizzes/edit"
              state={{ quiz }}
            >
              <ActionButton>
                Edit Quiz
              </ActionButton>
            </Link>

            <Link to="/hod/quizzes">
              <ActionButton variant="secondary">
                Back
              </ActionButton>
            </Link>
          </div>
        )}
      />

      <SectionCard
        eyebrow="ASSESSMENT INFORMATION"
        title="Quiz Overview"
        description="Core information supplied by the quiz management record."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="Quiz Title" value={title} />

          <DetailItem label="Quiz Status">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyles(quiz.status)}`}
            >
              {String(quiz.status || 'DRAFT').toUpperCase()}
            </span>
          </DetailItem>

          <DetailItem
            label="Course"
            value={getLabel(course, 'Not provided')}
          />

          <DetailItem
            label="Course Code"
            value={course?.code}
          />

          <DetailItem
            label="Department"
            value={getLabel(department, 'Not provided')}
          />

          <DetailItem
            label="Department Code"
            value={department?.code}
          />

          <DetailItem
            label="Start Date & Time"
            value={formatDate(quiz.startAt)}
          />

          <DetailItem
            label="End Date & Time"
            value={formatDate(quiz.endAt)}
          />

          <DetailItem
            label="Duration"
            value={
              quiz.durationMinutes
                ? `${quiz.durationMinutes} minutes`
                : 'Not provided'
            }
          />

          <DetailItem
            label="Total Marks"
            value={totalMarks}
          />

          <DetailItem
            label="Question Count"
            value={questions.length}
          />

          <DetailItem
            label="Quiz ID"
            value={getId(quiz)}
          />

          <DetailItem
            label="Created At"
            value={formatDate(quiz.createdAt)}
          />

          <DetailItem
            label="Last Updated"
            value={formatDate(quiz.updatedAt)}
          />

          <DetailItem
            label="Published At"
            value={formatDate(quiz.publishedAt)}
          />

          <DetailItem
            label="Closed At"
            value={formatDate(quiz.closedAt)}
          />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="ACADEMIC ALLOCATION"
        title="Assigned Batches"
        description="Batches associated with this quiz."
      >
        <RecordList items={batches} label="Batches" />
      </SectionCard>

      <SectionCard
        eyebrow="ACADEMIC ALLOCATION"
        title="Assigned Sections"
        description="Sections associated with this quiz."
      >
        <RecordList items={sections} label="Sections" />
      </SectionCard>

      <SectionCard
        eyebrow="INSTRUCTIONS"
        title="Quiz Description"
        description="Instructions and assessment information."
      >
        {quiz.description ? (
          <div className="whitespace-pre-wrap rounded-xl border border-[#343640] bg-[#191A21] p-4 text-sm leading-7 text-[#D0D0D8]">
            {quiz.description}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#454650] px-5 py-8 text-center">
            <p className="text-sm text-[#9697A2]">
              No quiz description available.
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="ASSESSMENT CONTENT"
        title="Quiz Questions"
        description="Questions, answer options, correct answers and marks."
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#A5A6B0]">
            {questions.length} questions
          </p>

          <p className="text-sm font-semibold text-[#CDB5F7]">
            Total: {totalMarks} marks
          </p>
        </div>

        {questions.length > 0 ? (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <QuestionCard
                key={question._id || question.id || `question-${index}`}
                question={question}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#454650] px-5 py-8 text-center">
            <p className="text-sm text-[#9697A2]">
              No questions are available in this quiz record.
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="RECORD OWNERSHIP"
        title="Created By"
        description="Creator information available in the quiz record."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem
            label="Creator"
            value={getLabel(creator)}
          />

          <DetailItem
            label="Creator Email"
            value={creator?.email}
          />

          <DetailItem
            label="Creator Role"
            value={creator?.role}
          />
        </div>
      </SectionCard>

      <div className="rounded-xl border border-[#454650] bg-[#191A21] p-4">
        <p className="text-sm font-semibold text-[#CDB5F7]">
          Record loading behavior
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          This page displays the quiz record passed through React Router
          navigation state. The current backend does not expose a
          GET-by-ID endpoint for quiz management. Opening this page
          directly or refreshing it may require reopening the quiz
          from the quiz overview.
        </p>
      </div>
    </div>
  );
}