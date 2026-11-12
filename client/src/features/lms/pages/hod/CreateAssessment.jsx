import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import assessmentManagementService, {
  ASSESSMENT_TYPES,
} from '../../services/assessmentManagementService.js';

const INITIAL_FORM = {
  title: '',
  description: '',
  type: ASSESSMENT_TYPES.INTERNAL,
  courseId: '',
  batchIds: [],
  sectionIds: [],
  assessmentDate: '',
  totalMarks: '100',
  passingMarks: '33',
};

const INPUT_CLASS = [
  'w-full rounded-xl border border-[#454650]',
  'bg-[#191A21] px-4 py-3 text-sm text-[#EAEAE6]',
  'placeholder:text-[#858590]',
  'outline-none transition-colors',
  'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const ASSESSMENT_TYPE_OPTIONS = [
  {
    value: ASSESSMENT_TYPES.INTERNAL,
    label: 'Internal',
    description: 'Regular internal examination.',
  },
  {
    value: ASSESSMENT_TYPES.MID_TERM_1,
    label: 'Mid Term 1',
    description: 'First mid-term examination.',
  },
  {
    value: ASSESSMENT_TYPES.MID_TERM_2,
    label: 'Mid Term 2',
    description: 'Second mid-term examination.',
  },
  {
    value: ASSESSMENT_TYPES.CLASS_TEST,
    label: 'Class Test',
    description: 'Classroom tests and periodic assessments.',
  },
  {
    value: ASSESSMENT_TYPES.PRACTICAL,
    label: 'Practical',
    description: 'Practical and laboratory assessments.',
  },
  {
    value: ASSESSMENT_TYPES.ASSIGNMENT,
    label: 'Assignment',
    description: 'Assignment-based evaluation.',
  },
  {
    value: ASSESSMENT_TYPES.OTHER,
    label: 'Other / Custom Test',
    description: 'Create an additional test with your own title.',
  },
];

function getResponseData(response) {
  return response?.data?.data ?? response?.data ?? {};
}

function getId(record) {
  if (!record) return '';

  if (typeof record === 'string') return record;

  return String(record.id ?? record._id ?? '');
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

function FormField({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  children,
}) {
  return (
    <div>
      <FieldLabel htmlFor={htmlFor} required={required}>
        {label}
      </FieldLabel>

      {children}

      {error && (
        <p className="mt-2 text-xs leading-5 text-rose-300">
          {error}
        </p>
      )}

      {!error && hint && (
        <p className="mt-2 text-xs leading-5 text-[#858590]">
          {hint}
        </p>
      )}
    </div>
  );
}

export default function CreateAssessment() {
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
      form.batchIds.includes(
        getId(section.batch),
      )
    ));
  }, [selectedCourse, form.batchIds]);

  const selectedType = useMemo(
    () => ASSESSMENT_TYPE_OPTIONS.find(
      (option) => option.value === form.type,
    ),
    [form.type],
  );

  useEffect(() => {
    let active = true;

    async function loadCourses() {
      setLoadingCourses(true);
      setCourseError('');

      try {
        const response = await api.get(
          '/v1/courses/department',
          {
            params: {
              page: 1,
              limit: 100,
              status: 'ACTIVE',
            },
          },
        );

        const data = getResponseData(response);

        const records = Array.isArray(data.courses)
          ? data.courses
          : [];

        if (active) {
          setCourses(records);
        }
      } catch (error) {
        if (active) {
          setCourseError(getErrorMessage(error));
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

    setErrors((current) => ({
      ...current,
      batchIds: '',
      sectionIds: '',
    }));

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

    setErrors((current) => ({
      ...current,
      sectionIds: '',
    }));

    setFormError('');
  }

  function validateForm() {
    const nextErrors = {};

    const title = form.title.trim();
    const description = form.description.trim();

    if (title.length < 2) {
      nextErrors.title =
        'Assessment title must contain at least 2 characters.';
    } else if (title.length > 200) {
      nextErrors.title =
        'Assessment title cannot exceed 200 characters.';
    }

    if (description.length > 5000) {
      nextErrors.description =
        'Description cannot exceed 5000 characters.';
    }

    if (!form.type) {
      nextErrors.type = 'Select an assessment type.';
    }

    if (!form.courseId) {
      nextErrors.courseId = 'Select a course.';
    }

    if (!form.assessmentDate) {
      nextErrors.assessmentDate =
        'Select the assessment date.';
    } else if (
      Number.isNaN(
        new Date(form.assessmentDate).getTime(),
      )
    ) {
      nextErrors.assessmentDate =
        'Enter a valid assessment date.';
    }

    const totalMarks = Number(form.totalMarks);
    const passingMarks = Number(form.passingMarks);

    if (
      !Number.isFinite(totalMarks)
      || totalMarks < 0.01
      || totalMarks > 10000
    ) {
      nextErrors.totalMarks =
        'Total marks must be greater than zero and cannot exceed 10000.';
    }

    if (
      !Number.isFinite(passingMarks)
      || passingMarks < 0
      || passingMarks > totalMarks
    ) {
      nextErrors.passingMarks =
        'Passing marks must be between zero and total marks.';
    }

    if (
      form.batchIds.length === 0
      && form.sectionIds.length === 0
    ) {
      nextErrors.batchIds =
        'Select at least one batch or section.';
    }

    if (
      form.batchIds.some(
        (id) => !availableBatches.some(
          (batch) => getId(batch) === id,
        ),
      )
    ) {
      nextErrors.batchIds =
        'One or more selected batches are not available for this course.';
    }

    if (
      form.sectionIds.some(
        (id) => !availableSections.some(
          (section) => getId(section) === id,
        ),
      )
    ) {
      nextErrors.sectionIds =
        'One or more selected sections are not available for this course and batch selection.';
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
      setFormError(
        'Course directory could not be loaded. Reload the page before creating an assessment.',
      );

      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      courseId: form.courseId,
      batchIds: form.batchIds,
      sectionIds: form.sectionIds,
      assessmentDate: new Date(
        form.assessmentDate,
      ).toISOString(),
      totalMarks: Number(form.totalMarks),
      passingMarks: Number(form.passingMarks),
    };

    setSaving(true);

    try {
      await assessmentManagementService.createAssessment(
        payload,
      );

      navigate('/hod/results', {
        replace: true,
        state: {
          notice: 'Assessment created successfully.',
        },
      });
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <PageHeader
        eyebrow="ACADEMIC MANAGEMENT"
        title="Create Assessment"
        description="Create an examination, internal assessment, practical, assignment evaluation, or additional custom test for your department."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Results', to: '/hod/results' },
          { label: 'Create Assessment' },
        ]}
        actions={
          <Link to="/hod/results">
            <ActionButton variant="secondary">
              Back to Results
            </ActionButton>
          </Link>
        }
      />

      <div className="rounded-2xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 p-5">
        <p className="text-sm font-semibold text-[#CDB5F7]">
          Flexible assessment management
        </p>

        <p className="mt-2 text-sm leading-6 text-[#A7A7B0]">
          Create Internal, Mid Term 1, Mid Term 2, Class Test,
          Practical, Assignment, or Other assessments. Use the
          custom title field to identify any additional test.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard
          title="Assessment Information"
          description="Enter the basic information and choose the type of assessment."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Assessment Type"
              htmlFor="assessment-type"
              required
              error={errors.type}
            >
              <select
                id="assessment-type"
                name="type"
                value={form.type}
                onChange={handleChange}
                className={INPUT_CLASS}
              >
                {ASSESSMENT_TYPE_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              {selectedType && (
                <p className="mt-2 text-xs text-[#858590]">
                  {selectedType.description}
                </p>
              )}
            </FormField>

            <FormField
              label={
                form.type === ASSESSMENT_TYPES.OTHER
                  ? 'Custom Test Name'
                  : 'Assessment Title'
              }
              htmlFor="assessment-title"
              required
              error={errors.title}
              hint={
                form.type === ASSESSMENT_TYPES.OTHER
                  ? 'Give your additional test a clear name.'
                  : 'Enter a descriptive assessment title.'
              }
            >
              <input
                id="assessment-title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                maxLength={200}
                className={INPUT_CLASS}
                placeholder={
                  form.type === ASSESSMENT_TYPES.OTHER
                    ? 'e.g. Unit Test 3'
                    : 'e.g. Data Structures Internal Assessment'
                }
              />
            </FormField>
          </div>

          <div className="mt-5">
            <FormField
              label="Description"
              htmlFor="assessment-description"
              error={errors.description}
              hint="Optional. Maximum 5000 characters."
            >
              <textarea
                id="assessment-description"
                name="description"
                rows={4}
                value={form.description}
                onChange={handleChange}
                maxLength={5000}
                className={INPUT_CLASS}
                placeholder="Add assessment instructions or other relevant details..."
              />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard
          title="Course and Student Allocation"
          description="Choose the course and assign the assessment to at least one batch or section."
        >
          <div className="space-y-5">
            <FormField
              label="Course"
              htmlFor="assessment-course"
              required
              error={errors.courseId || courseError}
            >
              <select
                id="assessment-course"
                name="courseId"
                value={form.courseId}
                onChange={handleCourseChange}
                disabled={loadingCourses || courses.length === 0}
                className={INPUT_CLASS}
              >
                <option value="">
                  {loadingCourses
                    ? 'Loading department courses...'
                    : courses.length === 0
                      ? 'No active courses available'
                      : 'Select a course'}
                </option>

                {courses.map((course) => {
                  const courseId = getId(course);
                  const title = course.title
                    || course.name
                    || 'Untitled course';

                  const code = course.code
                    || course.courseCode;

                  return (
                    <option
                      key={courseId}
                      value={courseId}
                    >
                      {code ? `${code} — ${title}` : title}
                    </option>
                  );
                })}
              </select>
            </FormField>

            {selectedCourse && (
              <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#858590]">
                  Selected Course
                </p>

                <p className="mt-2 font-semibold text-[#EAEAE6]">
                  {selectedCourse.title
                    || selectedCourse.name
                    || 'Untitled course'}
                </p>

                {selectedCourse.code && (
                  <p className="mt-1 text-xs text-[#858590]">
                    Course Code: {selectedCourse.code}
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                label="Batches"
                htmlFor="assessment-batches"
                error={errors.batchIds}
                hint="Use Ctrl or Command to select multiple batches."
              >
                <select
                  id="assessment-batches"
                  name="batchIds"
                  multiple
                  size={Math.min(
                    Math.max(availableBatches.length, 3),
                    6,
                  )}
                  value={form.batchIds}
                  onChange={handleBatchChange}
                  disabled={!selectedCourse || availableBatches.length === 0}
                  className={INPUT_CLASS}
                >
                  {availableBatches.map((batch) => {
                    const batchId = getId(batch);

                    return (
                      <option
                        key={batchId}
                        value={batchId}
                      >
                        {getRecordLabel(batch, 'Unnamed batch')}
                      </option>
                    );
                  })}
                </select>

                {selectedCourse && availableBatches.length === 0 && (
                  <p className="mt-2 text-xs text-[#858590]">
                    No batches are associated with this course.
                  </p>
                )}
              </FormField>

              <FormField
                label="Sections"
                htmlFor="assessment-sections"
                error={errors.sectionIds}
                hint="You can select multiple sections."
              >
                <select
                  id="assessment-sections"
                  name="sectionIds"
                  multiple
                  size={Math.min(
                    Math.max(availableSections.length, 3),
                    6,
                  )}
                  value={form.sectionIds}
                  onChange={handleSectionChange}
                  disabled={!selectedCourse || availableSections.length === 0}
                  className={INPUT_CLASS}
                >
                  {availableSections.map((section) => {
                    const sectionId = getId(section);

                    return (
                      <option
                        key={sectionId}
                        value={sectionId}
                      >
                        {getRecordLabel(section, 'Unnamed section')}
                      </option>
                    );
                  })}
                </select>

                {selectedCourse && availableSections.length === 0 && (
                  <p className="mt-2 text-xs text-[#858590]">
                    No sections are available for the selected course and batches.
                  </p>
                )}
              </FormField>
            </div>

            {!form.batchIds.length && !form.sectionIds.length && (
              <p className="rounded-xl border border-[#E5DF98]/20 bg-[#E5DF98]/5 p-3 text-xs leading-5 text-[#E5DF98]">
                At least one batch or section must be selected before
                creating the assessment.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Schedule and Marks"
          description="Set the assessment date, maximum marks, and passing marks."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Assessment Date"
              htmlFor="assessment-date"
              required
              error={errors.assessmentDate}
            >
              <input
                id="assessment-date"
                name="assessmentDate"
                type="datetime-local"
                value={form.assessmentDate}
                onChange={handleChange}
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField
              label="Total Marks"
              htmlFor="assessment-total-marks"
              required
              error={errors.totalMarks}
            >
              <input
                id="assessment-total-marks"
                name="totalMarks"
                type="number"
                min="0.01"
                max="10000"
                step="0.01"
                value={form.totalMarks}
                onChange={handleChange}
                className={INPUT_CLASS}
                placeholder="100"
              />
            </FormField>

            <FormField
              label="Passing Marks"
              htmlFor="assessment-passing-marks"
              required
              error={errors.passingMarks}
              hint="Passing marks cannot exceed total marks."
            >
              <input
                id="assessment-passing-marks"
                name="passingMarks"
                type="number"
                min="0"
                max="10000"
                step="0.01"
                value={form.passingMarks}
                onChange={handleChange}
                className={INPUT_CLASS}
                placeholder="33"
              />
            </FormField>
          </div>

          <div className="mt-5 rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[#858590]">
                  Passing Criteria
                </p>

                <p className="mt-1 text-sm text-[#EAEAE6]">
                  {Number(form.totalMarks) > 0
                    && Number.isFinite(Number(form.passingMarks))
                    ? `${form.passingMarks || 0} out of ${form.totalMarks} marks`
                    : 'Enter valid marks to preview the passing criteria.'}
                </p>
              </div>

              <span className="rounded-lg border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 px-3 py-2 text-sm font-semibold text-[#CDB5F7]">
                Draft
              </span>
            </div>

            <p className="mt-3 text-xs leading-5 text-[#858590]">
              New assessments are created as drafts. Student marks can
              be entered before publishing the results.
            </p>
          </div>
        </SectionCard>

        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-400/25 bg-rose-400/5 p-4"
          >
            <p className="text-sm font-semibold text-rose-300">
              Assessment could not be created
            </p>

            <p className="mt-1 text-sm leading-6 text-[#C5A8AE]">
              {formError}
            </p>
          </div>
        )}

        <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#343640] pt-5 sm:flex-row">
          <Link to="/hod/results">
            <ActionButton
              type="button"
              variant="secondary"
              disabled={saving}
            >
              Cancel
            </ActionButton>
          </Link>

          <ActionButton
            type="submit"
            loading={saving}
            disabled={saving || loadingCourses || Boolean(courseError)}
          >
            Create Assessment
          </ActionButton>
        </div>
      </form>
    </div>
  );
}