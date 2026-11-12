import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import quizManagementService from '../../services/quizManagementService.js';

const MAX_QUESTIONS = 200;
const MAX_OPTIONS = 10;

const INITIAL_FORM = {
  title: '',
  description: '',
  courseId: '',
  batchIds: [],
  sectionIds: [],
  startAt: '',
  endAt: '',
  durationMinutes: '30',
  status: 'DRAFT',
  questions: [
    {
      question: '',
      options: ['', ''],
      correctOptionIndex: 0,
      marks: '1',
    },
  ],
};

const INPUT_CLASS = [
  'w-full rounded-xl border border-[#454650]',
  'bg-[#191A21] px-4 py-3 text-sm text-[#EAEAE6]',
  'placeholder:text-[#858590]',
  'outline-none transition-colors',
  'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

function getResponseData(response) {
  return response?.data?.data ?? response?.data ?? {};
}

function getId(record) {
  if (!record) return '';

  if (typeof record === 'string') return record;

  return String(record.id ?? record._id ?? '');
}

function getCourseLabel(course) {
  const title = course.title || course.name || 'Untitled course';
  const code = course.code || course.courseCode;

  return code ? `${code} — ${title}` : title;
}

function getRecordLabel(record, fallback) {
  if (!record) return fallback;

  if (typeof record === 'string') return record;

  return (
    record.name
    || record.title
    || record.code
    || fallback
  );
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Unable to complete the request. Please try again.'
  );
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

function QuestionCard({
  question,
  index,
  errors,
  onQuestionChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onCorrectOptionChange,
  onRemoveQuestion,
}) {
  return (
    <div className="rounded-2xl border border-[#454650] bg-[#191A21] p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#CDB5F7]">
            Assessment
          </p>

          <h3 className="mt-1 text-base font-semibold text-[#EAEAE6]">
            Question {index + 1}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => onRemoveQuestion(index)}
          className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-400/10"
        >
          Remove Question
        </button>
      </div>

      <div className="space-y-5">
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
            <p className="mt-2 text-xs text-rose-300">
              {errors.question}
            </p>
          )}
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-[#D0D0D8]">
              Answer Options
            </p>

            <span className="text-xs text-[#858590]">
              Select the correct answer using the radio button.
            </span>
          </div>

          <div className="space-y-3">
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
                  className="shrink-0 rounded-lg px-2 py-2 text-xs text-rose-300 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Remove option ${optionIndex + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {errors?.options && (
            <p className="mt-2 text-xs text-rose-300">
              {errors.options}
            </p>
          )}

          <button
            type="button"
            onClick={() => onAddOption(index)}
            disabled={question.options.length >= MAX_OPTIONS}
            className="mt-3 text-sm font-semibold text-[#CDB5F7] transition hover:text-[#E0D2FF] disabled:opacity-40"
          >
            + Add Option
          </button>
        </div>

        <div className="max-w-xs">
          <FieldLabel htmlFor={`question-marks-${index}`} required>
            Question Marks
          </FieldLabel>

          <input
            id={`question-marks-${index}`}
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
            <p className="mt-2 text-xs text-rose-300">
              {errors.marks}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateQuiz() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState('');

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedCourse = useMemo(
    () => courses.find(
      (course) => getId(course) === form.courseId,
    ) || null,
    [courses, form.courseId],
  );

  const availableBatches = useMemo(
    () => selectedCourse?.batches || [],
    [selectedCourse],
  );

  const availableSections = useMemo(() => {
    const sections = selectedCourse?.sections || [];

    if (form.batchIds.length === 0) {
      return sections;
    }

    return sections.filter((section) => (
      form.batchIds.includes(String(section.batch || ''))
    ));
  }, [selectedCourse, form.batchIds]);

  const totalMarks = useMemo(
    () => form.questions.reduce(
      (total, question) => total + Number(question.marks || 0),
      0,
    ),
    [form.questions],
  );

  useEffect(() => {
    let active = true;

    async function loadCourses() {
      setLoadingCourses(true);
      setCourseError('');

      try {
        const response = await api.get('/v1/courses/department', {
          params: {
            page: 1,
            limit: 100,
            status: 'ACTIVE',
          },
        });

        const data = getResponseData(response);

        const records = Array.isArray(data.courses)
          ? data.courses
          : [];

        if (active) {
          setCourses(records);
        }
      } catch (error) {
        if (active) {
          setCourseError(
            getErrorMessage(error),
          );
        }
      } finally {
        if (active) {
          setLoadingCourses(false);
        }
      }
    }

    Promise.resolve().then(() => {
      if (active) {
        loadCourses();
      }
    });

    return () => {
      active = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));

    setFormError('');
  }

  function handleCourseChange(event) {
    setForm((current) => ({
      ...current,
      courseId: event.target.value,
      batchIds: [],
      sectionIds: [],
    }));

    setErrors({});
    setFormError('');
  }

  function handleBatchChange(event) {
    const batchIds = Array.from(
      event.target.selectedOptions,
      (option) => option.value,
    );

    setForm((current) => ({
      ...current,
      batchIds,
      sectionIds: [],
    }));

    setErrors({});
    setFormError('');
  }

  function handleSectionChange(event) {
    const sectionIds = Array.from(
      event.target.selectedOptions,
      (option) => option.value,
    );

    setForm((current) => ({
      ...current,
      sectionIds,
    }));

    setFormError('');
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

    setFormError('');
  }

  function updateOption(questionIndex, optionIndex, value) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => (
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, currentIndex) => (
                currentIndex === optionIndex ? value : option
              )),
            }
          : question
      )),
    }));

    setFormError('');
  }

  function addQuestion() {
    if (form.questions.length >= MAX_QUESTIONS) {
      setFormError(`A quiz cannot contain more than ${MAX_QUESTIONS} questions.`);
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
          marks: '1',
        },
      ],
    }));

    setFormError('');
  }

  function removeQuestion(index) {
    setForm((current) => ({
      ...current,
      questions: current.questions.filter(
        (_, questionIndex) => questionIndex !== index,
      ),
    }));

    setFormError('');
  }

  function addOption(questionIndex) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => (
        index === questionIndex
          ? {
              ...question,
              options: question.options.length < MAX_OPTIONS
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

    if (form.title.trim().length < 2) {
      nextErrors.title = 'Quiz title must contain at least 2 characters.';
    } else if (form.title.trim().length > 200) {
      nextErrors.title = 'Quiz title cannot exceed 200 characters.';
    }

    if (form.description.length > 10000) {
      nextErrors.description = 'Description cannot exceed 10000 characters.';
    }

    if (!form.courseId) {
      nextErrors.courseId = 'Select a course.';
    }

    if (!form.startAt) {
      nextErrors.startAt = 'Select a quiz start date and time.';
    }

    if (!form.endAt) {
      nextErrors.endAt = 'Select a quiz end date and time.';
    }

    const startAt = new Date(form.startAt);
    const endAt = new Date(form.endAt);

    if (
      form.startAt
      && form.endAt
      && (
        Number.isNaN(startAt.getTime())
        || Number.isNaN(endAt.getTime())
        || endAt <= startAt
      )
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

    if (!['DRAFT', 'PUBLISHED', 'CLOSED'].includes(form.status)) {
      nextErrors.status = 'Select a valid quiz status.';
    }

    if (form.questions.length === 0) {
      nextErrors.questions = 'Add at least one question.';
    }

    if (form.questions.length > MAX_QUESTIONS) {
      nextErrors.questions = `Maximum ${MAX_QUESTIONS} questions are allowed.`;
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
        || question.options.length > MAX_OPTIONS
        || question.options.some((option) => !option.trim())
      ) {
        questionErrors.options = 'Provide 2–10 non-empty options.';
      }

      const marks = Number(question.marks);

      if (
        !Number.isInteger(marks)
        || marks < 1
        || marks > 1000
      ) {
        questionErrors.marks = 'Marks must be between 1 and 1000.';
      }

      if (
        !Number.isInteger(question.correctOptionIndex)
        || question.correctOptionIndex < 0
        || question.correctOptionIndex >= question.options.length
      ) {
        questionErrors.options = 'Select a valid correct answer.';
      }

      if (Object.keys(questionErrors).length > 0) {
        nextErrors[`question-${index}`] = questionErrors;
      }
    });

    if (
      !Number.isInteger(totalMarks)
      || totalMarks < 1
      || totalMarks > 10000
    ) {
      nextErrors.questions = 'Total marks must be between 1 and 10000.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving || loadingCourses) return;

    setFormError('');

    if (!validateForm()) return;

    if (courseError) {
      setFormError('Course directory could not be loaded. Reload the page before creating the quiz.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      courseId: form.courseId,
      batchIds: form.batchIds,
      sectionIds: form.sectionIds,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      durationMinutes: Number(form.durationMinutes),
      status: form.status,
      questions: form.questions.map((question) => ({
        question: question.question.trim(),
        options: question.options.map((option) => option.trim()),
        correctOptionIndex: Number(question.correctOptionIndex),
        marks: Number(question.marks),
      })),
    };

    setSaving(true);

    try {
      await quizManagementService.createQuiz(payload);

      navigate('/hod/quizzes', {
        replace: true,
        state: {
          notice: 'Quiz created successfully.',
        },
      });
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="ACADEMIC MANAGEMENT"
        title="Create Quiz"
        description="Create a department quiz with course allocation, scheduling and multiple-choice questions."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Quizzes', to: '/hod/quizzes' },
          { label: 'Create Quiz' },
        ]}
        actions={(
          <Link to="/hod/quizzes">
            <ActionButton variant="secondary">
              Back to Quizzes
            </ActionButton>
          </Link>
        )}
      />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <SectionCard
          eyebrow="STEP 01"
          title="Quiz Information"
          description="Enter the quiz title, instructions and academic course."
        >
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="quiz-title" required>
                Quiz Title
              </FieldLabel>

              <input
                id="quiz-title"
                name="title"
                value={form.title}
                onChange={handleChange}
                maxLength={200}
                className={INPUT_CLASS}
                placeholder="Enter quiz title"
              />

              {errors.title && (
                <p className="mt-2 text-xs text-rose-300">
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="quiz-course" required>
                Course
              </FieldLabel>

              <select
                id="quiz-course"
                name="courseId"
                value={form.courseId}
                onChange={handleCourseChange}
                disabled={loadingCourses || Boolean(courseError)}
                className={INPUT_CLASS}
              >
                <option value="">
                  {loadingCourses ? 'Loading courses...' : 'Select course'}
                </option>

                {courses.map((course) => (
                  <option key={getId(course)} value={getId(course)}>
                    {getCourseLabel(course)}
                    {course.semester ? ` — Semester ${course.semester}` : ''}
                  </option>
                ))}
              </select>

              {errors.courseId && (
                <p className="mt-2 text-xs text-rose-300">
                  {errors.courseId}
                </p>
              )}

              {courseError && (
                <p className="mt-2 text-xs text-rose-300">
                  {courseError}
                </p>
              )}

              {!loadingCourses && !courseError && courses.length === 0 && (
                <p className="mt-2 text-xs text-[#9697A2]">
                  No active department courses are available.
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <FieldLabel htmlFor="quiz-description">
                Description / Instructions
              </FieldLabel>

              <textarea
                id="quiz-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                maxLength={10000}
                className={INPUT_CLASS}
                placeholder="Enter instructions for students..."
              />

              {errors.description && (
                <p className="mt-2 text-xs text-rose-300">
                  {errors.description}
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="STEP 02"
          title="Academic Allocation"
          description="Select the batches and sections assigned to the selected course."
        >
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="quiz-batches">
                Target Batches
              </FieldLabel>

              <select
                id="quiz-batches"
                multiple
                value={form.batchIds}
                onChange={handleBatchChange}
                disabled={!selectedCourse}
                className={`${INPUT_CLASS} min-h-36`}
              >
                {availableBatches.map((batch) => (
                  <option key={getId(batch)} value={getId(batch)}>
                    {getRecordLabel(batch, 'Unnamed batch')}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-[#858590]">
                Hold Ctrl or Cmd to select multiple batches. Leave empty if the quiz is not batch-specific.
              </p>
            </div>

            <div>
              <FieldLabel htmlFor="quiz-sections">
                Target Sections
              </FieldLabel>

              <select
                id="quiz-sections"
                multiple
                value={form.sectionIds}
                onChange={handleSectionChange}
                disabled={!selectedCourse}
                className={`${INPUT_CLASS} min-h-36`}
              >
                {availableSections.map((section) => (
                  <option key={getId(section)} value={getId(section)}>
                    {getRecordLabel(section, 'Unnamed section')}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-[#858590]">
                Hold Ctrl or Cmd to select multiple sections.
              </p>
            </div>

            {selectedCourse && (
              <div className="md:col-span-2 rounded-xl border border-[#454650] bg-[#191A21] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9697A2]">
                  Selected Course
                </p>

                <p className="mt-2 text-sm font-semibold text-[#EAEAE6]">
                  {getCourseLabel(selectedCourse)}
                </p>

                <p className="mt-1 text-xs text-[#9697A2]">
                  Semester: {selectedCourse.semester || 'Not specified'}
                </p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="STEP 03"
          title="Schedule and Duration"
          description="Configure when students can access the quiz and how long the assessment lasts."
        >
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="quiz-start" required>
                Start Date & Time
              </FieldLabel>

              <input
                id="quiz-start"
                name="startAt"
                type="datetime-local"
                value={form.startAt}
                onChange={handleChange}
                className={INPUT_CLASS}
              />

              {errors.startAt && (
                <p className="mt-2 text-xs text-rose-300">
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
                onChange={handleChange}
                className={INPUT_CLASS}
              />

              {errors.endAt && (
                <p className="mt-2 text-xs text-rose-300">
                  {errors.endAt}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="quiz-duration" required>
                Duration (Minutes)
              </FieldLabel>

              <input
                id="quiz-duration"
                name="durationMinutes"
                type="number"
                min="1"
                max="1440"
                step="1"
                value={form.durationMinutes}
                onChange={handleChange}
                className={INPUT_CLASS}
              />

              {errors.durationMinutes && (
                <p className="mt-2 text-xs text-rose-300">
                  {errors.durationMinutes}
                </p>
              )}

              <p className="mt-2 text-xs text-[#858590]">
                Maximum duration: 1440 minutes.
              </p>
            </div>

            <div>
              <FieldLabel htmlFor="quiz-status" required>
                Initial Status
              </FieldLabel>

              <select
                id="quiz-status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className={INPUT_CLASS}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="STEP 04"
          title="Quiz Questions"
          description="Add multiple-choice questions, configure answer options and assign marks."
        >
          <div className="space-y-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#454650] bg-[#191A21] p-4">
              <div>
                <p className="text-sm font-semibold text-[#EAEAE6]">
                  {form.questions.length} Questions
                </p>

                <p className="mt-1 text-xs text-[#9697A2]">
                  Maximum 200 questions per quiz.
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-[#9697A2]">
                  Total Marks
                </p>

                <p className="mt-1 text-xl font-bold text-[#CDB5F7]">
                  {totalMarks}
                </p>
              </div>
            </div>

            {errors.questions && (
              <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
                {errors.questions}
              </p>
            )}

            <div className="space-y-5">
              {form.questions.map((question, index) => (
                <QuestionCard
                  key={`new-question-${index}`}
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
            </div>

            <button
              type="button"
              onClick={addQuestion}
              disabled={form.questions.length >= MAX_QUESTIONS}
              className="w-full rounded-xl border border-dashed border-[#CDB5F7]/40 bg-[#CDB5F7]/5 px-4 py-4 text-sm font-semibold text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Add Another Question
            </button>
          </div>
        </SectionCard>

        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm leading-6 text-rose-200"
          >
            {formError}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
          <Link to="/hod/quizzes">
            <ActionButton variant="secondary">
              Cancel
            </ActionButton>
          </Link>

          <ActionButton
            type="submit"
            loading={saving}
            disabled={saving || loadingCourses || Boolean(courseError)}
          >
            {saving ? 'Creating Quiz...' : 'Create Quiz'}
          </ActionButton>
        </div>
      </form>
    </div>
  );
}