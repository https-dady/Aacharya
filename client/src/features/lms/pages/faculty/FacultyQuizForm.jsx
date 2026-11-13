import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import api from '../../../auth/services/api/axios.js';
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
  firstQuestion: '',
  options: ['', ''],
  correctOptionIndex: '0',
  questionMarks: '1',
};

function toDateTimeLocal(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const timezoneOffset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export default function FacultyQuizForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const quizId = searchParams.get('quizId');
  const isEditMode = Boolean(quizId);

  const [form, setForm] = useState(INITIAL_FORM);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [quizStatus, setQuizStatus] = useState('DRAFT');

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === form.courseId) || null,
    [courses, form.courseId],
  );

  const availableBatches = selectedCourse?.batches || [];
  const availableSections = selectedCourse?.sections || [];

  useEffect(() => {
    let active = true;

    async function initializeForm() {
      setLoading(true);
      setErrorMessage('');

      try {
        const [courseResponse, existingQuiz] = await Promise.all([
          api.get('/v1/courses/assigned-to-me'),
          isEditMode
            ? quizManagementService.getQuiz(quizId)
            : Promise.resolve(null),
        ]);

        const assignedCourses =
          courseResponse?.data?.data?.courses;

        if (!Array.isArray(assignedCourses)) {
          throw new Error(
            'The server returned an invalid assigned courses response.',
          );
        }

        if (!active) return;

        setCourses(assignedCourses);

        if (existingQuiz) {
          const courseId = String(
            existingQuiz.courseId ||
              existingQuiz.course?.id ||
              existingQuiz.course?._id ||
              '',
          );

          setQuizStatus(existingQuiz.status || 'DRAFT');

          setForm((current) => ({
            ...current,
            title: existingQuiz.title || '',
            description: existingQuiz.description || '',
            courseId,
            batchIds: existingQuiz.batchIds || [],
            sectionIds: existingQuiz.sectionIds || [],
            startAt: toDateTimeLocal(existingQuiz.startAt),
            endAt: toDateTimeLocal(existingQuiz.endAt),
            durationMinutes: String(
              existingQuiz.durationMinutes || 30,
            ),
          }));
        }
      } catch (error) {
        if (!active) return;

        setErrorMessage(
          getErrorMessage(
            error,
            'Unable to load quiz configuration.',
          ),
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    initializeForm();

    return () => {
      active = false;
    };
  }, [isEditMode, quizId]);

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

    setNotice('');
    setErrorMessage('');
  }

  function handleCourseChange(event) {
    const courseId = event.target.value;

    setForm((current) => ({
      ...current,
      courseId,
      batchIds: [],
      sectionIds: [],
    }));

    setErrors((current) => ({
      ...current,
      courseId: '',
      batchIds: '',
      sectionIds: '',
    }));

    setNotice('');
  }

  function handleAllocationChange(event, field) {
    const selectedIds = Array.from(
      event.target.selectedOptions,
      (option) => option.value,
    );

    setForm((current) => ({
      ...current,
      [field]: selectedIds,
    }));

    setErrors((current) => ({
      ...current,
      [field]: '',
    }));
  }

  function handleOptionChange(index, value) {
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

  function addOption() {
    if (form.options.length >= 10) return;

    setForm((current) => ({
      ...current,
      options: [...current.options, ''],
    }));
  }

  function removeOption(index) {
    if (form.options.length <= 2) return;

    setForm((current) => {
      const nextOptions = current.options.filter(
        (_, optionIndex) => optionIndex !== index,
      );

      let nextCorrectIndex = Number(current.correctOptionIndex);

      if (index === nextCorrectIndex) {
        nextCorrectIndex = 0;
      } else if (index < nextCorrectIndex) {
        nextCorrectIndex -= 1;
      }

      return {
        ...current,
        options: nextOptions,
        correctOptionIndex: String(nextCorrectIndex),
      };
    });
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = 'Quiz title is required.';
    } else if (form.title.trim().length < 2) {
      nextErrors.title = 'Quiz title must contain at least 2 characters.';
    } else if (form.title.trim().length > 200) {
      nextErrors.title = 'Quiz title cannot exceed 200 characters.';
    }

    if (!isEditMode && !form.courseId) {
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

    if (!form.startAt || !Number.isFinite(start)) {
      nextErrors.startAt = 'Enter a valid start date and time.';
    }

    if (!form.endAt || !Number.isFinite(end)) {
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

    if (!isEditMode) {
      if (!form.firstQuestion.trim()) {
        nextErrors.firstQuestion = 'Add the first question.';
      }

      if (
        form.options.length < 2 ||
        form.options.length > 10 ||
        form.options.some((option) => !option.trim())
      ) {
        nextErrors.options =
          'Provide between 2 and 10 non-empty options.';
      }

      const correctIndex = Number(form.correctOptionIndex);

      if (
        !Number.isInteger(correctIndex) ||
        correctIndex < 0 ||
        correctIndex >= form.options.length
      ) {
        nextErrors.correctOptionIndex =
          'Select a valid correct option.';
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
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateForm();

    setErrors(nextErrors);
    setNotice('');
    setErrorMessage('');

    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      if (isEditMode) {
        const payload = {
          title: form.title.trim(),
          description: form.description.trim(),
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          durationMinutes: Number(form.durationMinutes),
        };

        await quizManagementService.updateQuiz(quizId, payload);

        setNotice('Quiz configuration updated successfully.');

        navigate('/faculty/quizzes', {
          replace: true,
          state: {
            notice: 'Quiz configuration updated successfully.',
          },
        });

        return;
      }

      const selectedCourseRecord = selectedCourse;

      if (!selectedCourseRecord) {
        throw new Error('Select a valid assigned course.');
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
        questions: [
          {
            question: form.firstQuestion.trim(),
            options: form.options.map((option) => option.trim()),
            correctOptionIndex: Number(form.correctOptionIndex),
            marks: Number(form.questionMarks),
          },
        ],
      };

      const createdQuiz =
        await quizManagementService.createQuiz(payload);

      navigate(
        `/faculty/quizzes/questions?quizId=${encodeURIComponent(
          createdQuiz.id,
        )}`,
        {
          state: {
            quiz: createdQuiz,
          },
        },
      );
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          isEditMode
            ? 'Unable to update the quiz.'
            : 'Unable to create the quiz.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-[#343640] bg-[#191A21] p-8 text-sm text-[#A7A7B0]">
        Loading quiz configuration...
      </div>
    );
  }

  if (errorMessage && !courses.length && !isEditMode) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-5">
        <PageHeader
          eyebrow="FACULTY WORKSPACE"
          title="Create Quiz"
          description="Configure a quiz for your assigned course."
        />

        <div
          role="alert"
          className="rounded-2xl border border-[#D58B95]/40 bg-[#D58B95]/10 p-5 text-sm text-[#EAEAE6]"
        >
          {errorMessage}
        </div>

        <ActionButton
          variant="secondary"
          onClick={() => navigate('/faculty/quizzes')}
        >
          Back to Quizzes
        </ActionButton>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title={isEditMode ? 'Edit Quiz' : 'Create Quiz'}
        description={
          isEditMode
            ? 'Update quiz information and schedule without changing its existing questions or student allocation.'
            : 'Configure quiz information, academic allocation, timing, and the first question.'
        }
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
            label: isEditMode ? 'Edit Quiz' : 'Create Quiz',
          },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#343640] bg-[#191A21] p-4">
        <div>
          <p className="text-sm font-semibold text-[#EAEAE6]">
            {isEditMode ? 'Quiz update' : 'Quiz configuration'}
          </p>

          <p className="mt-1 text-sm text-[#9697A2]">
            {isEditMode
              ? `Current status: ${quizStatus}. Questions and learner allocation are preserved.`
              : 'Complete the required fields before proceeding to question management.'}
          </p>
        </div>

        <Link
          to="/faculty/quizzes"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#D0D0D8] transition-colors hover:border-[#CDB5F7]/50 hover:text-[#EAEAE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          Back to Quizzes
        </Link>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-[#D58B95]/40 bg-[#D58B95]/10 px-4 py-3 text-sm text-[#EAEAE6]"
        >
          {errorMessage}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-[#CDB5F7]/40 bg-[#CDB5F7]/10 px-4 py-3 text-sm text-[#EAEAE6]"
        >
          {notice}
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
              <FormField
                name="title"
                label="Quiz Title"
                value={form.title}
                onChange={handleChange}
                placeholder="Enter quiz title"
                required
                maxLength={200}
                error={errors.title}
              />

              <FormField
                name="durationMinutes"
                label="Duration (minutes)"
                type="number"
                min="1"
                max="1440"
                value={form.durationMinutes}
                onChange={handleChange}
                required
                error={errors.durationMinutes}
              />

              <div className="sm:col-span-2">
                <label
                  htmlFor="quiz-description"
                  className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                >
                  Description
                </label>

                <textarea
                  id="quiz-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  maxLength={10000}
                  className="w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-3 text-sm leading-6 text-[#EAEAE6] outline-none transition-colors placeholder:text-[#858590] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                  placeholder="Describe the assessment and its learning objectives..."
                />

                {errors.description && (
                  <p role="alert" className="mt-2 text-sm text-[#D58B95]">
                    {errors.description}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          {!isEditMode && (
            <SectionCard
              eyebrow="STEP 02"
              title="Academic Allocation"
              description="Choose one of your assigned courses and its learner groups."
            >
              <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="quiz-course"
                    className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                  >
                    Assigned Course
                    <span className="ml-1 text-[#E5DF98]">*</span>
                  </label>

                  <select
                    id="quiz-course"
                    value={form.courseId}
                    onChange={handleCourseChange}
                    className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-2.5 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                  >
                    <option value="">Select an assigned course</option>

                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} ({course.code})
                      </option>
                    ))}
                  </select>

                  {errors.courseId && (
                    <p role="alert" className="mt-2 text-sm text-[#D58B95]">
                      {errors.courseId}
                    </p>
                  )}
                </div>

                {selectedCourse && (
                  <div className="sm:col-span-2 rounded-xl border border-[#454650] bg-[#1D1F27] p-4">
                    <p className="text-sm font-semibold text-[#EAEAE6]">
                      {selectedCourse.title}
                    </p>

                    <p className="mt-1 text-xs text-[#9697A2]">
                      {selectedCourse.code}
                      {selectedCourse.semester
                        ? ` · Semester ${selectedCourse.semester}`
                        : ''}
                    </p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="quiz-batches"
                    className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                  >
                    Batches
                  </label>

                  <select
                    id="quiz-batches"
                    multiple
                    value={form.batchIds}
                    onChange={(event) =>
                      handleAllocationChange(event, 'batchIds')
                    }
                    disabled={!selectedCourse || !availableBatches.length}
                    className="min-h-32 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3 py-2 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] disabled:opacity-50"
                  >
                    {availableBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} {batch.code ? `(${batch.code})` : ''}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs text-[#9697A2]">
                    Hold Ctrl (Windows) or Command (Mac) to select multiple.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="quiz-sections"
                    className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                  >
                    Sections
                  </label>

                  <select
                    id="quiz-sections"
                    multiple
                    value={form.sectionIds}
                    onChange={(event) =>
                      handleAllocationChange(event, 'sectionIds')
                    }
                    disabled={!selectedCourse || !availableSections.length}
                    className="min-h-32 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3 py-2 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] disabled:opacity-50"
                  >
                    {availableSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name} {section.code ? `(${section.code})` : ''}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs text-[#9697A2]">
                    Leave both lists empty if the quiz applies to the entire course.
                  </p>
                </div>
              </div>
            </SectionCard>
          )}

          <SectionCard
            eyebrow={isEditMode ? 'STEP 02' : 'STEP 03'}
            title="Schedule and Duration"
            description="Set the quiz availability window and time limit."
          >
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <FormField
                name="startAt"
                label="Start Date and Time"
                type="datetime-local"
                value={form.startAt}
                onChange={handleChange}
                required
                error={errors.startAt}
              />

              <FormField
                name="endAt"
                label="End Date and Time"
                type="datetime-local"
                value={form.endAt}
                onChange={handleChange}
                required
                error={errors.endAt}
              />
            </div>
          </SectionCard>

          {!isEditMode && (
            <SectionCard
              eyebrow="STEP 04"
              title="Initial Question"
              description="A quiz must contain at least one multiple-choice question. You can add more questions on the next screen."
            >
              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <label
                    htmlFor="quiz-first-question"
                    className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                  >
                    Question
                  </label>

                  <textarea
                    id="quiz-first-question"
                    value={form.firstQuestion}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        firstQuestion: event.target.value,
                      }));

                      setErrors((current) => ({
                        ...current,
                        firstQuestion: '',
                      }));
                    }}
                    rows={3}
                    maxLength={5000}
                    className="w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-3 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                    placeholder="Enter your first question..."
                  />

                  {errors.firstQuestion && (
                    <p role="alert" className="mt-2 text-sm text-[#D58B95]">
                      {errors.firstQuestion}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#EAEAE6]">
                      Answer Options
                    </p>

                    <ActionButton
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addOption}
                      disabled={form.options.length >= 10}
                    >
                      Add Option
                    </ActionButton>
                  </div>

                  {form.options.map((option, index) => (
                    <div
                      key={`quiz-option-${index}`}
                      className="flex flex-wrap items-center gap-3"
                    >
                      <label className="flex min-w-0 flex-1 items-center gap-3">
                        <input
                          type="radio"
                          name="correctOptionIndex"
                          value={index}
                          checked={
                            Number(form.correctOptionIndex) === index
                          }
                          onChange={handleChange}
                          className="h-4 w-4 accent-[#CDB5F7]"
                        />

                        <input
                          type="text"
                          value={option}
                          onChange={(event) =>
                            handleOptionChange(index, event.target.value)
                          }
                          maxLength={1000}
                          placeholder={`Option ${index + 1}`}
                          className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-2.5 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7]"
                        />
                      </label>

                      <ActionButton
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeOption(index)}
                        disabled={form.options.length <= 2}
                      >
                        Remove
                      </ActionButton>
                    </div>
                  ))}

                  {errors.options && (
                    <p role="alert" className="text-sm text-[#D58B95]">
                      {errors.options}
                    </p>
                  )}

                  {errors.correctOptionIndex && (
                    <p role="alert" className="text-sm text-[#D58B95]">
                      {errors.correctOptionIndex}
                    </p>
                  )}
                </div>

                <div className="max-w-xs">
                  <FormField
                    name="questionMarks"
                    label="Question Marks"
                    type="number"
                    min="1"
                    max="1000"
                    value={form.questionMarks}
                    onChange={handleChange}
                    required
                    error={errors.questionMarks}
                  />
                </div>
              </div>
            </SectionCard>
          )}

          {isEditMode && (
            <div className="rounded-2xl border border-[#CDB5F7]/30 bg-[#CDB5F7]/5 p-5">
              <p className="text-sm font-semibold text-[#EAEAE6]">
                Questions and academic allocation are protected here
              </p>

              <p className="mt-2 text-sm leading-6 text-[#A7A7B0]">
                This edit form updates only the quiz title, description,
                schedule, and duration. Use the dedicated question
                management screen for question changes. The backend
                prevents question and learner-allocation changes after
                student attempts exist.
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Link
              to="/faculty/quizzes"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            >
              Cancel
            </Link>

            <ActionButton
              type="submit"
              loading={saving}
              disabled={saving}
            >
              {isEditMode ? 'Save Changes' : 'Create Quiz'}
            </ActionButton>
          </div>
        </div>
      </form>
    </div>
  );
}