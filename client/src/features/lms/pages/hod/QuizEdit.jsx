import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import quizManagementService from '../../services/quizManagementService.js';

const QUIZ_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED'];

const INPUT_CLASS = [
  'w-full rounded-xl border border-[#454650]',
  'bg-[#191A21] px-4 py-3 text-sm text-[#EAEAE6]',
  'placeholder:text-[#858590]',
  'outline-none transition-colors',
  'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
].join(' ');

function getId(value) {
  if (!value) return '';

  if (typeof value === 'string') return value;

  return String(value.id ?? value._id ?? '');
}

function toLocalDateTime(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 16);
}

function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];

  return questions.map((question) => ({
    question: question.question ?? '',
    options: Array.isArray(question.options)
      ? [...question.options]
      : ['', ''],
    correctOptionIndex: Number(question.correctOptionIndex ?? 0),
    marks: Number(question.marks ?? 1),
  }));
}

function normalizeQuiz(quiz) {
  return {
    title: quiz.title ?? '',
    description: quiz.description ?? '',
    startAt: toLocalDateTime(quiz.startAt),
    endAt: toLocalDateTime(quiz.endAt),
    durationMinutes: String(quiz.durationMinutes ?? ''),
    status: String(quiz.status ?? 'DRAFT').toUpperCase(),
    questions: normalizeQuestions(quiz.questions),
  };
}

function FieldLabel({ children, htmlFor, required = false }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-medium text-[#D0D0D8]"
    >
      {children}
      {required && (
        <span className="ml-1 text-[#CDB5F7]">*</span>
      )}
    </label>
  );
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Quiz could not be updated. Please try again.'
  );
}

function getTotalMarks(questions) {
  return questions.reduce(
    (total, question) => total + Number(question.marks || 0),
    0,
  );
}

function QuestionCard({
  question,
  index,
  onQuestionChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onCorrectOptionChange,
  onRemoveQuestion,
  errors,
}) {
  return (
    <div className="rounded-2xl border border-[#454650] bg-[#191A21] p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-[#EAEAE6]">
          Question {index + 1}
        </h3>

        <button
          type="button"
          onClick={() => onRemoveQuestion(index)}
          className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-400/10"
        >
          Remove Question
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <FieldLabel htmlFor={`question-${index}`} required>
            Question
          </FieldLabel>

          <textarea
            id={`question-${index}`}
            value={question.question}
            onChange={(event) => onQuestionChange(
              index,
              'question',
              event.target.value,
            )}
            rows={3}
            maxLength={5000}
            className={INPUT_CLASS}
            placeholder="Enter your question..."
          />

          {errors?.question && (
            <p className="mt-1 text-xs text-rose-300">
              {errors.question}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-[#D0D0D8]">
            Answer Options
          </p>

          {question.options.map((option, optionIndex) => (
            <div
              key={`question-${index}-option-${optionIndex}`}
              className="flex items-center gap-3"
            >
              <input
                type="radio"
                name={`correct-option-${index}`}
                checked={question.correctOptionIndex === optionIndex}
                onChange={() => onCorrectOptionChange(
                  index,
                  optionIndex,
                )}
                className="h-4 w-4 accent-[#CDB5F7]"
                aria-label={`Mark option ${optionIndex + 1} as correct`}
              />

              <input
                value={option}
                onChange={(event) => onOptionChange(
                  index,
                  optionIndex,
                  event.target.value,
                )}
                maxLength={1000}
                className={INPUT_CLASS}
                placeholder={`Option ${optionIndex + 1}`}
                aria-label={`Option ${optionIndex + 1}`}
              />

              <button
                type="button"
                onClick={() => onRemoveOption(index, optionIndex)}
                disabled={question.options.length <= 2}
                className="shrink-0 rounded-lg px-2 py-2 text-xs text-rose-300 hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={`Remove option ${optionIndex + 1}`}
              >
                Remove
              </button>
            </div>
          ))}

          {errors?.options && (
            <p className="text-xs text-rose-300">
              {errors.options}
            </p>
          )}

          <button
            type="button"
            onClick={() => onAddOption(index)}
            disabled={question.options.length >= 10}
            className="text-sm font-semibold text-[#CDB5F7] hover:text-[#E0D2FF] disabled:opacity-40"
          >
            + Add Option
          </button>

          <p className="text-xs text-[#858590]">
            Select the radio button beside the correct answer.
          </p>
        </div>

        <div className="max-w-xs">
          <FieldLabel htmlFor={`marks-${index}`} required>
            Question Marks
          </FieldLabel>

          <input
            id={`marks-${index}`}
            type="number"
            min="1"
            max="1000"
            step="1"
            value={question.marks}
            onChange={(event) => onQuestionChange(
              index,
              'marks',
              event.target.value,
            )}
            className={INPUT_CLASS}
          />

          {errors?.marks && (
            <p className="mt-1 text-xs text-rose-300">
              {errors.marks}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuizEdit() {
  const location = useLocation();
  const navigate = useNavigate();
  const { quizId: routeQuizId } = useParams();

  const routeQuiz = location.state?.quiz ?? null;
  const quizId = routeQuizId || getId(routeQuiz);

  const [quiz, setQuiz] = useState(
    () => routeQuizId ? null : routeQuiz,
  );

  const [form, setForm] = useState(
    () => routeQuizId || !routeQuiz ? null : normalizeQuiz(routeQuiz),
  );

  const [loading, setLoading] = useState(Boolean(quizId));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!quizId) {
      setQuiz(routeQuiz);
      setForm(routeQuiz ? normalizeQuiz(routeQuiz) : null);
      setLoading(false);
      setError('');
      return undefined;
    }

    let isActive = true;

    async function loadQuiz() {
      setLoading(true);
      setError('');

      try {
        const result = await quizManagementService.getQuiz(quizId);

        if (isActive) {
          setQuiz(result);
          setForm(normalizeQuiz(result));
          setErrors({});
        }
      } catch (requestError) {
        if (isActive) {
          setQuiz(null);
          setForm(null);
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadQuiz();

    return () => {
      isActive = false;
    };
  }, [quizId, routeQuiz]);

  const originalQuestions = normalizeQuestions(quiz?.questions);

  const questionsChanged = Boolean(
    form
    && JSON.stringify(form.questions) !== JSON.stringify(originalQuestions),
  );

  const totalMarks = form
    ? getTotalMarks(form.questions)
    : 0;

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));

    setError('');
  }

  function updateQuestion(index, field, value) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) => (
        questionIndex === index
          ? { ...question, [field]: value }
          : question
      )),
    }));

    setError('');
  }

  function updateOption(questionIndex, optionIndex, value) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex) return question;

        return {
          ...question,
          options: question.options.map((option, currentIndex) => (
            currentIndex === optionIndex ? value : option
          )),
        };
      }),
    }));

    setError('');
  }

  function addQuestion() {
    if (form.questions.length >= 200) {
      setError('A quiz cannot contain more than 200 questions.');
      return;
    }

    setForm((current) => ({
      ...current,
      questions: [
        ...current.questions,
        {
          question: '',
          options: ['', ''],
          correctOptionIndex: 0,
          marks: 1,
        },
      ],
    }));

    setError('');
  }

  function removeQuestion(index) {
    setForm((current) => ({
      ...current,
      questions: current.questions.filter(
        (_, questionIndex) => questionIndex !== index,
      ),
    }));

    setError('');
  }

  function addOption(questionIndex) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => (
        index === questionIndex
          ? {
              ...question,
              options: question.options.length < 10
                ? [...question.options, '']
                : question.options,
            }
          : question
      )),
    }));
  }

  function removeOption(questionIndex, optionIndex) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex) return question;

        const options = question.options.filter(
          (_, currentIndex) => currentIndex !== optionIndex,
        );

        let correctOptionIndex = question.correctOptionIndex;

        if (correctOptionIndex === optionIndex) {
          correctOptionIndex = 0;
        } else if (correctOptionIndex > optionIndex) {
          correctOptionIndex -= 1;
        }

        return {
          ...question,
          options,
          correctOptionIndex,
        };
      }),
    }));

    setError('');
  }

  function updateCorrectOption(questionIndex, optionIndex) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => (
        index === questionIndex
          ? { ...question, correctOptionIndex: optionIndex }
          : question
      )),
    }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.title.trim() || form.title.trim().length < 2) {
      nextErrors.title = 'Quiz title must contain at least 2 characters.';
    } else if (form.title.trim().length > 200) {
      nextErrors.title = 'Quiz title cannot exceed 200 characters.';
    }

    if (form.description.length > 10000) {
      nextErrors.description = 'Description cannot exceed 10000 characters.';
    }

    const startAt = new Date(form.startAt);
    const endAt = new Date(form.endAt);

    if (!form.startAt || Number.isNaN(startAt.getTime())) {
      nextErrors.startAt = 'A valid start date is required.';
    }

    if (!form.endAt || Number.isNaN(endAt.getTime())) {
      nextErrors.endAt = 'A valid end date is required.';
    } else if (
      !Number.isNaN(startAt.getTime())
      && endAt <= startAt
    ) {
      nextErrors.endAt = 'End time must be later than start time.';
    }

    const duration = Number(form.durationMinutes);

    if (
      !Number.isInteger(duration)
      || duration < 1
      || duration > 1440
    ) {
      nextErrors.durationMinutes = 'Duration must be between 1 and 1440 minutes.';
    }

    if (!QUIZ_STATUSES.includes(form.status)) {
      nextErrors.status = 'Select a valid quiz status.';
    }

    if (questionsChanged) {
      if (form.questions.length === 0) {
        nextErrors.questions = 'A quiz must contain at least one question.';
      }

      if (form.questions.length > 200) {
        nextErrors.questions = 'A quiz cannot contain more than 200 questions.';
      }

      form.questions.forEach((question, index) => {
        const questionErrors = {};

        if (!question.question.trim()) {
          questionErrors.question = 'Question text is required.';
        } else if (question.question.length > 5000) {
          questionErrors.question = 'Question cannot exceed 5000 characters.';
        }

        if (
          question.options.length < 2
          || question.options.length > 10
          || question.options.some((option) => !option.trim())
        ) {
          questionErrors.options = 'Provide 2 to 10 non-empty options.';
        }

        if (
          !Number.isInteger(Number(question.marks))
          || Number(question.marks) < 1
          || Number(question.marks) > 1000
        ) {
          questionErrors.marks = 'Marks must be between 1 and 1000.';
        }

        if (
          question.correctOptionIndex < 0
          || question.correctOptionIndex >= question.options.length
        ) {
          questionErrors.options = 'Select a valid correct answer.';
        }

        if (Object.keys(questionErrors).length > 0) {
          nextErrors[`question-${index}`] = questionErrors;
        }
      });

      const calculatedMarks = getTotalMarks(form.questions);

      if (
        !Number.isInteger(calculatedMarks)
        || calculatedMarks < 1
        || calculatedMarks > 10000
      ) {
        nextErrors.questions = 'Total quiz marks must be between 1 and 10000.';
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');

    if (!quizId) {
      setError('Quiz ID is unavailable. Return to the quiz list and open the record again.');
      return;
    }

    if (!validateForm()) return;

    const original = normalizeQuiz(quiz);

    const payload = {};

    if (form.title.trim() !== original.title) {
      payload.title = form.title.trim();
    }

    if (form.description.trim() !== original.description) {
      payload.description = form.description.trim();
    }

    const startAt = new Date(form.startAt).toISOString();
    const endAt = new Date(form.endAt).toISOString();

    if (startAt !== new Date(quiz.startAt).toISOString()) {
      payload.startAt = startAt;
    }

    if (endAt !== new Date(quiz.endAt).toISOString()) {
      payload.endAt = endAt;
    }

    if (
      Number(form.durationMinutes)
      !== Number(quiz.durationMinutes)
    ) {
      payload.durationMinutes = Number(form.durationMinutes);
    }

    if (form.status !== original.status) {
      payload.status = form.status;
    }

    if (questionsChanged) {
      payload.questions = form.questions.map((question) => ({
        question: question.question.trim(),
        options: question.options.map((option) => option.trim()),
        correctOptionIndex: Number(question.correctOptionIndex),
        marks: Number(question.marks),
      }));
    }

    if (Object.keys(payload).length === 0) {
      setError('No changes detected.');
      return;
    }

    setSubmitting(true);

    try {
      await quizManagementService.updateQuiz(quizId, payload);

      navigate('/hod/quizzes', {
        replace: true,
        state: {
          notice: 'Quiz updated successfully.',
        },
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="ACADEMIC MANAGEMENT"
          title="Loading Quiz"
          description="Retrieving the latest quiz information."
          breadcrumbs={[
            { label: 'HOD Dashboard', to: '/hod/dashboard' },
            { label: 'Quizzes', to: '/hod/quizzes' },
            { label: 'Edit' },
          ]}
        />

        <SectionCard>
          <div className="flex items-center justify-center gap-3 px-5 py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#CDB5F7] border-t-transparent" />

            <p className="text-sm text-[#A7A7B0]">
              Loading quiz information...
            </p>
          </div>
        </SectionCard>
      </div>
    );
  }

  if (!quiz || !form) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="ACADEMIC MANAGEMENT"
          title="Edit Quiz"
          description="Update quiz information and assessment settings."
          breadcrumbs={[
            { label: 'HOD Dashboard', to: '/hod/dashboard' },
            { label: 'Quizzes', to: '/hod/quizzes' },
            { label: 'Edit' },
          ]}
        />

        <SectionCard>
          <div className="px-5 py-10 text-center">
            <h2 className="text-lg font-semibold text-[#EAEAE6]">
              {error ? 'Unable to load quiz' : 'Quiz not selected'}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#A7A7B0]">
              {error || 'No quiz ID or quiz record was supplied. Return to the quiz list and select a quiz.'}
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ACADEMIC MANAGEMENT"
        title="Edit Quiz"
        description="Update quiz details, schedule and questions."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Quizzes', to: '/hod/quizzes' },
          { label: 'Edit' },
        ]}
        actions={(
          <Link to="/hod/quizzes">
            <ActionButton variant="secondary">
              Cancel
            </ActionButton>
          </Link>
        )}
      />

      <SectionCard
        title="Quiz Information"
        description="Update the quiz information and assessment schedule."
      >
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="quiz-title" required>
                Quiz Title
              </FieldLabel>

              <input
                id="quiz-title"
                name="title"
                value={form.title}
                onChange={updateField}
                maxLength={200}
                className={INPUT_CLASS}
                placeholder="Enter quiz title"
              />

              {errors.title && (
                <p className="mt-1 text-xs text-rose-300">
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="quiz-status" required>
                Status
              </FieldLabel>

              <select
                id="quiz-status"
                name="status"
                value={form.status}
                onChange={updateField}
                className={INPUT_CLASS}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="quiz-start" required>
                Start Date & Time
              </FieldLabel>

              <input
                id="quiz-start"
                name="startAt"
                type="datetime-local"
                value={form.startAt}
                onChange={updateField}
                className={INPUT_CLASS}
              />

              {errors.startAt && (
                <p className="mt-1 text-xs text-rose-300">
                  {errors.startAt}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="quiz-end" required>
                End Date & Time
              </FieldLabel>

              <input
                id="quiz-end"
                name="endAt"
                type="datetime-local"
                value={form.endAt}
                onChange={updateField}
                className={INPUT_CLASS}
              />

              {errors.endAt && (
                <p className="mt-1 text-xs text-rose-300">
                  {errors.endAt}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="quiz-duration" required>
                Duration (minutes)
              </FieldLabel>

              <input
                id="quiz-duration"
                name="durationMinutes"
                type="number"
                min="1"
                max="1440"
                value={form.durationMinutes}
                onChange={updateField}
                className={INPUT_CLASS}
              />

              {errors.durationMinutes && (
                <p className="mt-1 text-xs text-rose-300">
                  {errors.durationMinutes}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="quiz-total-marks">
                Total Marks
              </FieldLabel>

              <div
                id="quiz-total-marks"
                className="rounded-xl border border-[#454650] bg-[#191A21] px-4 py-3 text-sm font-semibold text-[#CDB5F7]"
              >
                {totalMarks}

                <span className="ml-2 font-normal text-[#858590]">
                  Calculated from question marks
                </span>
              </div>
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="quiz-description">
              Description / Instructions
            </FieldLabel>

            <textarea
              id="quiz-description"
              name="description"
              value={form.description}
              onChange={updateField}
              rows={5}
              maxLength={10000}
              className={INPUT_CLASS}
              placeholder="Enter quiz instructions..."
            />

            {errors.description && (
              <p className="mt-1 text-xs text-rose-300">
                {errors.description}
              </p>
            )}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Questions"
        description="Manage multiple-choice questions, answer options and marks."
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#EAEAE6]">
              {form.questions.length} Questions
            </p>

            <p className="mt-1 text-xs text-[#858590]">
              Total marks: {totalMarks}
            </p>
          </div>

          <button
            type="button"
            onClick={addQuestion}
            disabled={form.questions.length >= 200}
            className="rounded-xl border border-[#CDB5F7]/30 bg-[#CDB5F7]/10 px-4 py-2.5 text-sm font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/20 disabled:opacity-40"
          >
            + Add Question
          </button>
        </div>

        {errors.questions && (
          <p className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
            {errors.questions}
          </p>
        )}

        <div className="space-y-5">
          {form.questions.map((question, index) => (
            <QuestionCard
              key={`question-${index}`}
              question={question}
              index={index}
              errors={errors[`question-${index}`]}
              onQuestionChange={updateQuestion}
              onOptionChange={updateOption}
              onAddOption={addOption}
              onRemoveOption={removeOption}
              onCorrectOptionChange={updateCorrectOption}
              onRemoveQuestion={removeQuestion}
            />
          ))}

          {form.questions.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#454650] p-8 text-center">
              <p className="text-sm text-[#A7A7B0]">
                No questions added yet.
              </p>

              <button
                type="button"
                onClick={addQuestion}
                className="mt-3 text-sm font-semibold text-[#CDB5F7]"
              >
                Add your first question
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      <div className="rounded-xl border border-[#E5DF98]/20 bg-[#E5DF98]/5 p-4">
        <p className="text-sm font-semibold text-[#E5DF98]">
          Important: Student Attempts
        </p>

        <p className="mt-1 text-sm leading-6 text-[#A7A7B0]">
          Once students have attempted this quiz, the backend prevents
          changes to questions and academic assignments. Metadata changes
          are sent separately so unchanged questions are not unnecessarily
          submitted again. The backend remains the final authority.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
        <Link to="/hod/quizzes">
          <ActionButton variant="secondary">
            Cancel
          </ActionButton>
        </Link>

        <ActionButton
          type="button"
          loading={submitting}
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Saving Changes...' : 'Save Changes'}
        </ActionButton>
      </div>
    </div>
  );
}