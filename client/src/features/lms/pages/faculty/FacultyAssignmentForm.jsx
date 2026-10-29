import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  contentType: 'ASSIGNMENT',
  title: '',
  courseId: '',
  batchIds: [],
  sectionIds: [],
  description: '',
  instructions: '',
  dueDate: '',
  totalMarks: '100',
};

const INPUT_CLASS = [
  'w-full rounded-xl border border-[#454650] bg-[#1D1F27]',
  'px-3.5 py-3 text-sm text-[#EAEAE6]',
  'placeholder:text-[#858590]',
  'outline-none transition-colors',
  'hover:border-[#62636E]',
  'focus-visible:ring-2 focus-visible:ring-[#CDB5F7]',
].join(' ');

const LABEL_CLASS =
  'mb-2 block text-sm font-semibold text-[#EAEAE6]';

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message
    || error?.message
    || fallback
  );
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function FacultyAssignmentForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [courses, setCourses] = useState([]);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('error');

  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignedCourses() {
      setIsLoadingCourses(true);
      setNotice('');

      try {
        const response = await api.get(
          '/v1/courses/assigned-to-me',
        );

        const body = response?.data;
        const assignedCourses = body?.data?.courses;

        if (!Array.isArray(assignedCourses)) {
          throw new Error(
            'The server returned an invalid assigned-courses response.',
          );
        }

        if (cancelled) {
          return;
        }

        setCourses(assignedCourses);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCourses([]);

        setNotice(
          getErrorMessage(
            error,
            'Unable to load your assigned courses.',
          ),
        );

        setNoticeType('error');
      } finally {
        if (!cancelled) {
          setIsLoadingCourses(false);
        }
      }
    }

    loadAssignedCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCourse = useMemo(
    () => courses.find(
      (course) => course.id === form.courseId,
    ) || null,
    [courses, form.courseId],
  );

  const availableBatches = selectedCourse?.batches || [];
  const availableSections = selectedCourse?.sections || [];

  const selectedBatches = useMemo(
    () => availableBatches.filter(
      (batch) => form.batchIds.includes(batch.id),
    ),
    [availableBatches, form.batchIds],
  );

  const selectedSections = useMemo(
    () => availableSections.filter(
      (section) => form.sectionIds.includes(section.id),
    ),
    [availableSections, form.sectionIds],
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => {
      const next = {
        ...current,
        [name]: value,
      };

      if (name === 'courseId') {
        next.batchIds = [];
        next.sectionIds = [];
      }

      return next;
    });

    setErrors((current) => ({
      ...current,
      [name]: '',
      ...(name === 'courseId'
        ? {
            batchIds: '',
            sectionIds: '',
          }
        : {}),
    }));

    setNotice('');
  }

  function toggleSelection(fieldName, id) {
    setForm((current) => {
      const currentValues = current[fieldName];

      const nextValues = currentValues.includes(id)
        ? currentValues.filter((value) => value !== id)
        : [...currentValues, id];

      return {
        ...current,
        [fieldName]: nextValues,
      };
    });

    setErrors((current) => ({
      ...current,
      [fieldName]: '',
    }));

    setNotice('');
  }

  function validateForm() {
    const nextErrors = {};

    if (
      !['ASSIGNMENT', 'PRACTICAL'].includes(
        form.contentType,
      )
    ) {
      nextErrors.contentType = 'Select a valid content type.';
    }

    if (!form.title.trim()) {
      nextErrors.title = 'Title is required.';
    } else if (form.title.trim().length > 150) {
      nextErrors.title = 'Title cannot exceed 150 characters.';
    }

    if (!form.courseId) {
      nextErrors.courseId = 'Select an assigned course.';
    } else if (!selectedCourse) {
      nextErrors.courseId =
        'The selected course is no longer available. Reload the page.';
    }

    if (
      form.batchIds.length === 0
      && form.sectionIds.length === 0
    ) {
      nextErrors.batchIds =
        'Select at least one batch or section.';
    }

    if (!form.description.trim()) {
      nextErrors.description = 'Description is required.';
    } else if (form.description.trim().length > 5000) {
      nextErrors.description =
        'Description cannot exceed 5,000 characters.';
    }

    if (!form.instructions.trim()) {
      nextErrors.instructions =
        'Student instructions are required.';
    } else if (form.instructions.trim().length > 5000) {
      nextErrors.instructions =
        'Instructions cannot exceed 5,000 characters.';
    }

    if (!form.dueDate) {
      nextErrors.dueDate = 'Submission deadline is required.';
    } else {
      const deadline = new Date(form.dueDate);

      if (Number.isNaN(deadline.getTime())) {
        nextErrors.dueDate = 'Enter a valid deadline.';
      } else if (deadline.getTime() <= Date.now()) {
        nextErrors.dueDate =
          'The deadline must be in the future.';
      }
    }

    if (!form.totalMarks.trim()) {
      nextErrors.totalMarks = 'Maximum marks are required.';
    } else {
      const marks = Number(form.totalMarks);

      if (
        !Number.isFinite(marks)
        || marks <= 0
        || marks > 10000
      ) {
        nextErrors.totalMarks =
          'Enter marks between 1 and 10,000.';
      }
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const nextErrors = validateForm();

    setErrors(nextErrors);
    setNotice('');

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    /*
     * The current Assignment model stores one description field.
     * Keep the instructions with that description instead of sending
     * unsupported fields that the backend schema does not define.
     */
    const combinedDescription = [
      form.description.trim(),
      '',
      'Student Instructions:',
      form.instructions.trim(),
    ].join('\n');

    const payload = {
      contentType: form.contentType,
      title: form.title.trim(),
      description: combinedDescription,
      courseId: form.courseId,
      batchIds: form.batchIds,
      sectionIds: form.sectionIds,
      dueDate: new Date(form.dueDate).toISOString(),
      totalMarks: Number(form.totalMarks),
      status: 'DRAFT',
    };

    setIsSubmitting(true);

    try {
      await api.post(
        '/v1/assignments/manage',
        payload,
      );

      setNoticeType('success');
      setNotice(
        `${form.contentType === 'PRACTICAL' ? 'Practical' : 'Assignment'} saved successfully as a draft.`,
      );

      window.setTimeout(() => {
        navigate('/faculty/assignments');
      }, 700);
    } catch (error) {
      setNoticeType('error');

      setNotice(
        getErrorMessage(
          error,
          'Unable to save this item. Please try again.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setErrors({});
    setNotice('');
    setNoticeType('error');
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title={
          form.contentType === 'PRACTICAL'
            ? 'Create Practical'
            : 'Create Assignment'
        }
        description="Create coursework or practical work for students in your assigned courses."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'Assignments',
            to: '/faculty/assignments',
          },
          {
            label: 'Create',
          },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#343640] bg-[#191A21] p-4">
        <div>
          <p className="text-sm font-semibold text-[#EAEAE6]">
            Assignment & Practical Management
          </p>

          <p className="mt-1 text-sm leading-5 text-[#9697A2]">
            Select an assigned course, choose its target groups,
            and configure the deadline.
          </p>
        </div>

        <Link
          to="/faculty/assignments"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#D0D0D8] transition-colors hover:border-[#CDB5F7]/50 hover:text-[#EAEAE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          Back to Assignments
        </Link>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6">
          <SectionCard
            eyebrow="STEP 01"
            title="Content Information"
            description="Choose whether you are creating an assignment or a practical."
          >
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <label
                  htmlFor="contentType"
                  className={LABEL_CLASS}
                >
                  Content Type
                  <span className="ml-1 text-[#E5DF98]">*</span>
                </label>

                <select
                  id="contentType"
                  name="contentType"
                  value={form.contentType}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                  aria-invalid={Boolean(errors.contentType)}
                >
                  <option value="ASSIGNMENT">Assignment</option>
                  <option value="PRACTICAL">Practical</option>
                </select>

                {errors.contentType && (
                  <p className="mt-2 text-sm text-[#D58B95]">
                    {errors.contentType}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="title"
                  className={LABEL_CLASS}
                >
                  Title
                  <span className="ml-1 text-[#E5DF98]">*</span>
                </label>

                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  maxLength={150}
                  required
                  placeholder={
                    form.contentType === 'PRACTICAL'
                      ? 'e.g. Practical 01 — Linked Lists'
                      : 'e.g. Data Structures — Linked Lists'
                  }
                  className={INPUT_CLASS}
                  aria-invalid={Boolean(errors.title)}
                />

                {errors.title && (
                  <p className="mt-2 text-sm text-[#D58B95]">
                    {errors.title}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 02"
            title="Course and Target Groups"
            description="Only courses assigned to your account are available."
          >
            <div className="space-y-6 p-5 sm:p-6">
              <div>
                <label
                  htmlFor="courseId"
                  className={LABEL_CLASS}
                >
                  Assigned Course
                  <span className="ml-1 text-[#E5DF98]">*</span>
                </label>

                <select
                  id="courseId"
                  name="courseId"
                  value={form.courseId}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                  disabled={isLoadingCourses || courses.length === 0}
                  aria-invalid={Boolean(errors.courseId)}
                  required
                >
                  <option value="">
                    {isLoadingCourses
                      ? 'Loading assigned courses...'
                      : courses.length === 0
                        ? 'No assigned active courses available'
                        : 'Select an assigned course'}
                  </option>

                  {courses.map((course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.code} — {course.title}
                    </option>
                  ))}
                </select>

                {errors.courseId && (
                  <p className="mt-2 text-sm text-[#D58B95]">
                    {errors.courseId}
                  </p>
                )}

                {!isLoadingCourses && courses.length === 0 && (
                  <p className="mt-2 text-xs leading-5 text-[#9697A2]">
                    Assign a course to your account before creating
                    coursework. If you believe this is incorrect,
                    contact your HOD.
                  </p>
                )}

                {selectedCourse && (
                  <div className="mt-3 rounded-xl border border-[#454650] bg-[#191A21] p-3">
                    <p className="text-sm font-medium text-[#EAEAE6]">
                      {selectedCourse.title}
                    </p>

                    <p className="mt-1 text-xs text-[#9697A2]">
                      Code: {selectedCourse.code}
                      {selectedCourse.semester
                        ? ` · Semester: ${selectedCourse.semester}`
                        : ''}
                    </p>
                  </div>
                )}
              </div>

              {selectedCourse && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-[#EAEAE6]">
                        Target Batches
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-[#9697A2]">
                        Select one or more batches assigned to this course.
                      </p>
                    </div>

                    {availableBatches.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[#454650] p-4 text-sm text-[#9697A2]">
                        No batches are assigned to this course.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {availableBatches.map((batch) => (
                          <label
                            key={batch.id}
                            className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#454650] bg-[#1D1F27] p-3 transition-colors hover:border-[#CDB5F7]/50"
                          >
                            <input
                              type="checkbox"
                              checked={form.batchIds.includes(batch.id)}
                              onChange={() => toggleSelection(
                                'batchIds',
                                batch.id,
                              )}
                              className="mt-1 accent-[#CDB5F7]"
                            />

                            <span>
                              <span className="block text-sm font-medium text-[#EAEAE6]">
                                {batch.name}
                              </span>

                              <span className="mt-1 block text-xs text-[#9697A2]">
                                {batch.code}
                                {batch.academicYear
                                  ? ` · ${batch.academicYear}`
                                  : ''}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    {errors.batchIds && (
                      <p className="mt-2 text-sm text-[#D58B95]">
                        {errors.batchIds}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-[#EAEAE6]">
                        Target Sections
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-[#9697A2]">
                        Select specific sections when required.
                      </p>
                    </div>

                    {availableSections.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[#454650] p-4 text-sm text-[#9697A2]">
                        No sections are assigned to this course.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {availableSections.map((section) => (
                          <label
                            key={section.id}
                            className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#454650] bg-[#1D1F27] p-3 transition-colors hover:border-[#CDB5F7]/50"
                          >
                            <input
                              type="checkbox"
                              checked={form.sectionIds.includes(section.id)}
                              onChange={() => toggleSelection(
                                'sectionIds',
                                section.id,
                              )}
                              className="mt-1 accent-[#CDB5F7]"
                            />

                            <span>
                              <span className="block text-sm font-medium text-[#EAEAE6]">
                                {section.name}
                              </span>

                              <span className="mt-1 block text-xs text-[#9697A2]">
                                {section.code}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    {errors.sectionIds && (
                      <p className="mt-2 text-sm text-[#D58B95]">
                        {errors.sectionIds}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedCourse && (
                <div className="rounded-xl border border-[#454650] bg-[#191A21] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#9697A2]">
                    Selected Target Groups
                  </p>

                  <p className="mt-2 text-sm text-[#EAEAE6]">
                    {selectedBatches.length} batch(es),{' '}
                    {selectedSections.length} section(s)
                  </p>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 03"
            title="Description and Instructions"
            description="Explain the work and clearly describe the expected submission."
          >
            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <label
                  htmlFor="description"
                  className={LABEL_CLASS}
                >
                  Description
                  <span className="ml-1 text-[#E5DF98]">*</span>
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  maxLength={5000}
                  required
                  placeholder="Describe the problem, learning objectives, or practical task..."
                  className={INPUT_CLASS}
                  aria-invalid={Boolean(errors.description)}
                />

                <div className="mt-2 flex items-start justify-between gap-3">
                  {errors.description ? (
                    <p className="text-sm text-[#D58B95]">
                      {errors.description}
                    </p>
                  ) : (
                    <p className="text-xs text-[#9697A2]">
                      Maximum 5,000 characters.
                    </p>
                  )}

                  <span className="shrink-0 text-xs text-[#9697A2]">
                    {form.description.length}/5000
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="instructions"
                  className={LABEL_CLASS}
                >
                  Student Instructions
                  <span className="ml-1 text-[#E5DF98]">*</span>
                </label>

                <textarea
                  id="instructions"
                  name="instructions"
                  value={form.instructions}
                  onChange={handleChange}
                  rows={5}
                  maxLength={5000}
                  required
                  placeholder="Explain the submission process, formatting requirements, and evaluation criteria..."
                  className={INPUT_CLASS}
                  aria-invalid={Boolean(errors.instructions)}
                />

                <div className="mt-2 flex items-start justify-between gap-3">
                  {errors.instructions ? (
                    <p className="text-sm text-[#D58B95]">
                      {errors.instructions}
                    </p>
                  ) : (
                    <p className="text-xs text-[#9697A2]">
                      Maximum 5,000 characters.
                    </p>
                  )}

                  <span className="shrink-0 text-xs text-[#9697A2]">
                    {form.instructions.length}/5000
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 04"
            title="Deadline and Evaluation"
            description="Configure when students must submit their work and the maximum marks."
          >
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <label
                  htmlFor="dueDate"
                  className={LABEL_CLASS}
                >
                  Submission Deadline
                  <span className="ml-1 text-[#E5DF98]">*</span>
                </label>

                <input
                  id="dueDate"
                  name="dueDate"
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={handleChange}
                  required
                  className={INPUT_CLASS}
                  aria-invalid={Boolean(errors.dueDate)}
                />

                {errors.dueDate ? (
                  <p className="mt-2 text-sm text-[#D58B95]">
                    {errors.dueDate}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[#9697A2]">
                    {form.dueDate
                      ? `Deadline: ${formatDate(form.dueDate)}`
                      : 'Choose a future date and time.'}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="totalMarks"
                  className={LABEL_CLASS}
                >
                  Maximum Marks
                  <span className="ml-1 text-[#E5DF98]">*</span>
                </label>

                <input
                  id="totalMarks"
                  name="totalMarks"
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={form.totalMarks}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 100"
                  className={INPUT_CLASS}
                  aria-invalid={Boolean(errors.totalMarks)}
                />

                {errors.totalMarks && (
                  <p className="mt-2 text-sm text-[#D58B95]">
                    {errors.totalMarks}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          <div className="rounded-xl border border-[#454650] bg-[#191A21] p-4">
            <p className="text-sm font-medium text-[#EAEAE6]">
              Draft saving
            </p>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              This form saves the item as a draft. File uploads and
              allowed submission-file restrictions are not included
              in this request; those require backend support.
            </p>
          </div>

          {notice && (
            <div
              role="status"
              aria-live="polite"
              className={[
                'rounded-xl border p-4 text-sm leading-6',
                noticeType === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-200',
              ].join(' ')}
            >
              {notice}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Reset Form
            </ActionButton>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Link
                to="/faculty/assignments"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                Cancel
              </Link>

              <ActionButton
                type="submit"
                disabled={
                  isSubmitting
                  || isLoadingCourses
                  || courses.length === 0
                }
              >
                {isSubmitting
                  ? 'Saving Draft...'
                  : `Save ${form.contentType === 'PRACTICAL' ? 'Practical' : 'Assignment'} Draft`}
              </ActionButton>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}