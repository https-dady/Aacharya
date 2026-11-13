import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import api from '../../auth/services/api/axios.js';
import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import quizManagementService from '../../services/quizManagementService.js';

const INITIAL_FORM = {
  title: '',
  description: '',
  courseId: '',
  batchIds: [],
  sectionIds: [],
  startAt: '',
  endAt: '',
  durationMinutes: '30',
  question: '',
  options: ['', '', '', ''],
  correctOptionIndex: '0',
  questionMarks: '1',
};

function getId(value) {
  if (!value) return '';

  if (typeof value === 'object') {
    return String(value.id || value._id || '');
  }

  return String(value);
}

function formatError(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Unable to complete the quiz request.'
  );
}

function CheckboxOption({
  checked,
  label,
  description,
  onChange,
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#343640] bg-[#191A21] p-4 transition-colors hover:border-[#CDB5F7]/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-[#CDB5F7]"
      />

      <span className="min-w-0">
        <span className="block text-sm font-medium text-[#EAEAE6]">
          {label}
        </span>

        {description && (
          <span className="mt-1 block text-xs leading-5 text-[#9697A2]">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export default function FacultyQuizForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [courses, setCourses] = useState([]);

  const [courseLoading, setCourseLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadAssignedCourses() {
      setCourseLoading(true);
      setError('');

      try {
        const response = await api.get(
          '/v1/courses/assigned-to-me',
        );

        const assignedCourses =
          response?.data?.data?.courses;

        if (!Array.isArray(assignedCourses)) {
          throw new Error(
            'The server returned an invalid assigned course list.',
          );
        }

        if (active) {
          setCourses(assignedCourses);
        }
      } catch (loadError) {
        if (active) {
          setError(formatError(loadError));
          setCourses([]);
        }
      } finally {
        if (active) {
          setCourseLoading(false);
        }
      }
    }

    loadAssignedCourses();

    return () => {
      active = false;
    };
  }, []);

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) => getId(course) === form.courseId,
      ) || null,
    [courses, form.courseId],
  );

  const availableBatches = selectedCourse?.batches || [];
  const availableSections = selectedCourse?.sections || [];

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));

    setNotice('');
    setError('');
  }

  function handleCourseChange(event) {
    const courseId = event.target.value;

    setForm((current) => ({
      ...current,
      courseId,
      batchIds: [],
      sectionIds: [],
    }));

    setErrors({});
    setNotice('');
    setError('');
  }

  function toggleIdentifier(field, identifier) {
    setForm((current) => {
      const existing = current[field];

      const next = existing.includes(identifier)
        ? existing.filter((id) => id !== identifier)
        : [...existing, identifier];

      return {
        ...current,
        [field]: next,
      };
    });

    setErrors((current) => ({
      ...current,
      [field]: '',
    }));
  }

  function updateOption(index, value) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    }));

    setErrors((current) => ({
      ...current,
      options: '',
    }));
  }

  function validateForm() {
    const nextErrors = {};

    if (form.title.trim().length < 2) {
      nextErrors.title =
        'Quiz title must contain at least 2 characters.';
    } else if (form.title.trim().length > 200) {
      nextErrors.title =
        'Quiz title cannot exceed 200 characters.';
    }

    if (!form.courseId) {
      nextErrors.courseId = 'Select an assigned course.';
    }

    if (form.description.trim().length > 10000) {
      nextErrors.description =
        'Description cannot exceed 10,000 characters.';
    }

    const start = form.startAt
      ? new Date(form.startAt).getTime()
      : NaN;

    const end = form.endAt
      ? new Date(form.endAt).getTime()
      : NaN;

    if (!Number.isFinite(start)) {
      nextErrors.startAt = 'Enter a valid start date and time.';
    }

    if (!Number.isFinite(end)) {
      nextErrors.endAt = 'Enter a valid end date and time.';
    } else if (Number.isFinite(start) && end <= start) {
      nextErrors.endAt = 'End time must be after start time.';
    }

    const duration = Number(form.durationMinutes);

    if (
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 1440
    ) {
      nextErrors.durationMinutes =
        'Duration must be between 1 and 1,440 minutes.';
    }

    if (!form.question.trim()) {
      nextErrors.question = 'Question text is required.';
    } else if (form.question.trim().length > 5000) {
      nextErrors.question =
        'Question cannot exceed 5,000 characters.';
    }

    const normalizedOptions = form.options.map((option) =>
      option.trim(),
    );

    if (normalizedOptions.some((option) => !option)) {
      nextErrors.options =
        'All four answer options must be completed.';
    } else if (
      normalizedOptions.some((option) => option.length > 1000)
    ) {
      nextErrors.options =
        'An answer option cannot exceed 1,000 characters.';
    }

    const marks = Number(form.questionMarks);

    if (
      !Number.isInteger(marks) ||
      marks < 1 ||
      marks > 1000
    ) {
      nextErrors.questionMarks =
        'Question marks must be between 1 and 1,000.';
    }

    const correctIndex = Number(form.correctOptionIndex);

    if (
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex >= normalizedOptions.length
    ) {
      nextErrors.correctOptionIndex =
        'Select a valid correct answer.';
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) return;

    const nextErrors = validateForm();

    setErrors(nextErrors);
    setNotice('');
    setError('');

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),

        courseId: form.courseId,

        batchIds: form.batchIds,
        sectionIds: form.sectionIds,

        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),

        durationMinutes: Number(form.durationMinutes),

        totalMarks: Number(form.questionMarks),

        status: 'DRAFT',

        questions: [
          {
            question: form.question.trim(),

            options: form.options.map((option) =>
              option.trim(),
            ),

            correctOptionIndex: Number(
              form.correctOptionIndex,
            ),

            marks: Number(form.questionMarks),
          },
        ],
      };

      const createdQuiz =
        await quizManagementService.createQuiz(payload);

      setNotice('Quiz created successfully.');

      navigate(
        `/faculty/quizzes/questions?quizId=${encodeURIComponent(createdQuiz.id)}`,
        {
          state: {
            quiz: createdQuiz,
          },
        },
      );
    } catch (submitError) {
      setError(formatError(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setErrors({});
    setNotice('');
    setError('');
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Create Quiz"
        description="Configure the quiz, select its academic allocation, and add the first question."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'Quizzes',
            to: '/faculty/quizzes',
          },
          {
            label: 'Create Quiz',
          },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#343640] bg-[#191A21] p-4">
        <div>
          <p className="text-sm font-semibold text-[#EAEAE6]">
            Quiz configuration
          </p>

          <p className="mt-1 text-sm text-[#9697A2]">
            A quiz requires at least one question before it can be saved.
          </p>
        </div>

        <Link
          to="/faculty/quizzes"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#D0D0D8] transition-colors hover:border-[#CDB5F7]/50 hover:text-[#EAEAE6]"
        >
          Back to Quizzes
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-300"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6">
          <SectionCard
            eyebrow="STEP 01"
            title="Quiz Information"
            description="Enter the quiz title and description."
          >
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div className="sm:col-span-2">
                <FormField
                  name="title"
                  label="Quiz Title"
                  value={form.title}
                  onChange={(event) =>
                    updateField('title', event.target.value)
                  }
                  placeholder="Enter quiz title"
                  required
                  maxLength={200}
                  error={errors.title}
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="quiz-description"
                  className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                >
                  Description
                </label>

                <textarea
                  id="quiz-description"
                  value={form.description}
                  onChange={(event) =>
                    updateField('description', event.target.value)
                  }
                  rows={4}
                  maxLength={10000}
                  className="w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-3 text-sm leading-6 text-[#EAEAE6] outline-none placeholder:text-[#858590] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                  placeholder="Describe the quiz and its learning objectives..."
                />

                {errors.description && (
                  <p className="mt-2 text-sm text-red-300">
                    {errors.description}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 02"
            title="Course Allocation"
            description="Select a course assigned to your Faculty account."
          >
            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <label
                  htmlFor="quiz-course"
                  className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                >
                  Assigned Course
                </label>

                <select
                  id="quiz-course"
                  value={form.courseId}
                  onChange={handleCourseChange}
                  disabled={courseLoading || courses.length === 0}
                  className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-2.5 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {courseLoading
                      ? 'Loading assigned courses...'
                      : 'Select a course'}
                  </option>

                  {courses.map((course) => (
                    <option
                      key={getId(course)}
                      value={getId(course)}
                    >
                      {course.code
                        ? `${course.code} — ${course.title}`
                        : course.title}
                    </option>
                  ))}
                </select>

                {errors.courseId && (
                  <p className="mt-2 text-sm text-red-300">
                    {errors.courseId}
                  </p>
                )}

                {!courseLoading && courses.length === 0 && (
                  <p className="mt-2 text-sm text-amber-200">
                    No active assigned courses are available.
                  </p>
                )}
              </div>

              {selectedCourse && (
                <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
                  <p className="font-medium text-[#EAEAE6]">
                    {selectedCourse.title}
                  </p>

                  <p className="mt-1 text-xs text-[#9697A2]">
                    {selectedCourse.code}
                    {selectedCourse.semester
                      ? ` · ${selectedCourse.semester}`
                      : ''}
                  </p>
                </div>
              )}

              {selectedCourse && (
                <>
                  <div>
                    <p className="mb-3 text-sm font-semibold text-[#EAEAE6]">
                      Target Batches
                    </p>

                    {availableBatches.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {availableBatches.map((batch) => {
                          const id = getId(batch);

                          return (
                            <CheckboxOption
                              key={id}
                              checked={form.batchIds.includes(id)}
                              label={batch.name || batch.code || id}
                              description={batch.academicYear || ''}
                              onChange={() =>
                                toggleIdentifier('batchIds', id)
                              }
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-[#9697A2]">
                        No batches are allocated to this course.
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-[#EAEAE6]">
                      Target Sections
                    </p>

                    {availableSections.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {availableSections.map((section) => {
                          const id = getId(section);

                          return (
                            <CheckboxOption
                              key={id}
                              checked={form.sectionIds.includes(id)}
                              label={section.name || section.code || id}
                              description={section.code || ''}
                              onChange={() =>
                                toggleIdentifier('sectionIds', id)
                              }
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-[#9697A2]">
                        No sections are allocated to this course.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 03"
            title="Schedule and Duration"
            description="Set the availability window and quiz duration."
          >
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <FormField
                name="startAt"
                label="Start Date and Time"
                type="datetime-local"
                value={form.startAt}
                onChange={(event) =>
                  updateField('startAt', event.target.value)
                }
                required
                error={errors.startAt}
              />

              <FormField
                name="endAt"
                label="End Date and Time"
                type="datetime-local"
                value={form.endAt}
                onChange={(event) =>
                  updateField('endAt', event.target.value)
                }
                required
                error={errors.endAt}
              />

              <FormField
                name="durationMinutes"
                label="Duration (minutes)"
                type="number"
                value={form.durationMinutes}
                onChange={(event) =>
                  updateField('durationMinutes', event.target.value)
                }
                min="1"
                max="1440"
                step="1"
                required
                error={errors.durationMinutes}
                helperText="Maximum duration: 24 hours."
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 04"
            title="Initial Question"
            description="The backend requires at least one question when a quiz is created."
          >
            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <label
                  htmlFor="quiz-question"
                  className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                >
                  Question
                </label>

                <textarea
                  id="quiz-question"
                  value={form.question}
                  onChange={(event) =>
                    updateField('question', event.target.value)
                  }
                  rows={3}
                  maxLength={5000}
                  className="w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-3 text-sm leading-6 text-[#EAEAE6] outline-none placeholder:text-[#858590] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                  placeholder="Enter your first multiple-choice question..."
                />

                {errors.question && (
                  <p className="mt-2 text-sm text-red-300">
                    {errors.question}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {form.options.map((option, index) => (
                  <div key={index}>
                    <label
                      htmlFor={`quiz-option-${index}`}
                      className="mb-2 block text-sm font-medium text-[#D0D0D8]"
                    >
                      Option {index + 1}
                    </label>

                    <input
                      id={`quiz-option-${index}`}
                      value={option}
                      onChange={(event) =>
                        updateOption(index, event.target.value)
                      }
                      maxLength={1000}
                      className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-2.5 text-sm text-[#EAEAE6] outline-none placeholder:text-[#858590] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                      placeholder={`Enter option ${index + 1}`}
                    />
                  </div>
                ))}
              </div>

              {errors.options && (
                <p className="text-sm text-red-300">
                  {errors.options}
                </p>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="quiz-correct-option"
                    className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                  >
                    Correct Answer
                  </label>

                  <select
                    id="quiz-correct-option"
                    value={form.correctOptionIndex}
                    onChange={(event) =>
                      updateField(
                        'correctOptionIndex',
                        event.target.value,
                      )
                    }
                    className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-2.5 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                  >
                    {form.options.map((option, index) => (
                      <option key={index} value={String(index)}>
                        Option {index + 1}
                      </option>
                    ))}
                  </select>

                  {errors.correctOptionIndex && (
                    <p className="mt-2 text-sm text-red-300">
                      {errors.correctOptionIndex}
                    </p>
                  )}
                </div>

                <FormField
                  name="questionMarks"
                  label="Question Marks"
                  type="number"
                  value={form.questionMarks}
                  onChange={(event) =>
                    updateField('questionMarks', event.target.value)
                  }
                  min="1"
                  max="1000"
                  step="1"
                  required
                  error={errors.questionMarks}
                />
              </div>
            </div>
          </SectionCard>

          <div className="rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 p-4">
            <p className="text-sm font-semibold text-[#DCCBFA]">
              Quiz will be saved as Draft
            </p>

            <p className="mt-1 text-sm leading-6 text-[#B8B0C9]">
              After creation, you can continue configuring its questions.
              The quiz will not be published automatically.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={submitting}
            >
              Reset Form
            </ActionButton>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Link
                to="/faculty/quizzes"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#26272B]"
              >
                Cancel
              </Link>

              <ActionButton
                type="submit"
                disabled={submitting || courseLoading || courses.length === 0}
              >
                {submitting ? 'Creating Quiz...' : 'Create Draft Quiz'}
              </ActionButton>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}