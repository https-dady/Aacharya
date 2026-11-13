import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import assessmentManagementService from '../../services/assessmentManagementService.js';

const ASSESSMENT_TYPES = [
  'INTERNAL',
  'MID_TERM_1',
  'MID_TERM_2',
  'CLASS_TEST',
  'PRACTICAL',
  'ASSIGNMENT',
  'OTHER',
];

const ASSESSMENT_STATUSES = [
  'DRAFT',
  'PUBLISHED',
  'CLOSED',
];

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

function normalizeAssessment(assessment) {
  return {
    title: assessment.title ?? '',
    description: assessment.description ?? '',
    type: assessment.type ?? 'INTERNAL',
    assessmentDate: toLocalDateTime(
      assessment.assessmentDate ??
      assessment.date ??
      assessment.scheduledAt,
    ),
    passingMarks: String(assessment.passingMarks ?? 0),
    status: String(assessment.status ?? 'DRAFT').toUpperCase(),
  };
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Assessment could not be updated. Please try again.'
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

export default function ResultEdit() {
  const location = useLocation();
  const navigate = useNavigate();

  const assessment = location.state?.result ?? null;
  const assessmentId = getId(assessment);

  const [form, setForm] = useState(
    () => assessment ? normalizeAssessment(assessment) : null,
  );

  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

    setError('');
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.title.trim() || form.title.trim().length < 2) {
      nextErrors.title =
        'Assessment title must contain at least 2 characters.';
    } else if (form.title.trim().length > 200) {
      nextErrors.title =
        'Assessment title cannot exceed 200 characters.';
    }

    if (form.description.length > 5000) {
      nextErrors.description =
        'Description cannot exceed 5000 characters.';
    }

    if (!ASSESSMENT_TYPES.includes(form.type)) {
      nextErrors.type = 'Select a valid assessment type.';
    }

    if (!form.assessmentDate) {
      nextErrors.assessmentDate =
        'Assessment date is required.';
    } else if (
      Number.isNaN(new Date(form.assessmentDate).getTime())
    ) {
      nextErrors.assessmentDate =
        'Enter a valid assessment date.';
    }

    const passingMarks = Number(form.passingMarks);
    const totalMarks = Number(assessment.totalMarks);

    if (
      form.passingMarks === '' ||
      !Number.isFinite(passingMarks) ||
      passingMarks < 0 ||
      passingMarks > 10000
    ) {
      nextErrors.passingMarks =
        'Passing marks must be between 0 and 10000.';
    } else if (
      Number.isFinite(totalMarks) &&
      passingMarks > totalMarks
    ) {
      nextErrors.passingMarks =
        'Passing marks cannot exceed maximum marks.';
    }

    if (!ASSESSMENT_STATUSES.includes(form.status)) {
      nextErrors.status = 'Select a valid assessment status.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');

    if (!assessmentId) {
      setError(
        'Assessment ID is unavailable. Return to Results and open the assessment again.',
      );
      return;
    }

    if (!validateForm()) return;

    const original = normalizeAssessment(assessment);
    const payload = {};

    if (form.title.trim() !== original.title) {
      payload.title = form.title.trim();
    }

    if (form.description.trim() !== original.description) {
      payload.description = form.description.trim();
    }

    if (form.type !== original.type) {
      payload.type = form.type;
    }

    if (form.assessmentDate !== original.assessmentDate) {
      payload.assessmentDate = new Date(
        form.assessmentDate,
      ).toISOString();
    }

    if (
      Number(form.passingMarks) !==
      Number(original.passingMarks)
    ) {
      payload.passingMarks = Number(form.passingMarks);
    }

    if (form.status !== original.status) {
      payload.status = form.status;
    }

    if (Object.keys(payload).length === 0) {
      setError('No changes detected.');
      return;
    }

    setSubmitting(true);

    try {
      await assessmentManagementService.updateAssessment(
        assessmentId,
        payload,
      );

      navigate('/hod/results', {
        replace: true,
        state: {
          notice: 'Assessment updated successfully.',
        },
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  if (!assessment || !form) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="ACADEMIC OVERSIGHT"
          title="Edit Assessment"
          description="Update assessment information."
          breadcrumbs={[
            { label: 'HOD Dashboard', to: '/hod/dashboard' },
            { label: 'Results', to: '/hod/results' },
            { label: 'Edit' },
          ]}
        />

        <SectionCard>
          <div className="px-5 py-10 text-center">
            <h2 className="text-lg font-semibold text-[#EAEAE6]">
              No assessment selected
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#A7A7B0]">
              Open the edit page from a selected assessment record.
              Assessment information was not supplied.
            </p>

            <div className="mt-6">
              <Link to="/hod/results">
                <ActionButton variant="secondary">
                  Back to Results
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
        eyebrow="ACADEMIC OVERSIGHT"
        title="Edit Assessment"
        description="Update assessment details and lifecycle settings."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Results', to: '/hod/results' },
          { label: 'Edit' },
        ]}
        actions={(
          <Link to="/hod/results">
            <ActionButton variant="secondary">
              Cancel
            </ActionButton>
          </Link>
        )}
      />

      <SectionCard
        title="Assessment Information"
        description="Update the fields supported by the assessment management API."
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          noValidate
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="assessment-title" required>
                Assessment Title
              </FieldLabel>

              <input
                id="assessment-title"
                name="title"
                value={form.title}
                onChange={handleChange}
                maxLength={200}
                className={INPUT_CLASS}
                placeholder="Enter assessment title"
              />

              {errors.title && (
                <p className="mt-1 text-xs text-rose-300">
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="assessment-type" required>
                Assessment Type
              </FieldLabel>

              <select
                id="assessment-type"
                name="type"
                value={form.type}
                onChange={handleChange}
                className={INPUT_CLASS}
              >
                {ASSESSMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>

              {errors.type && (
                <p className="mt-1 text-xs text-rose-300">
                  {errors.type}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="assessment-date" required>
                Assessment Date
              </FieldLabel>

              <input
                id="assessment-date"
                name="assessmentDate"
                type="datetime-local"
                value={form.assessmentDate}
                onChange={handleChange}
                className={INPUT_CLASS}
              />

              {errors.assessmentDate && (
                <p className="mt-1 text-xs text-rose-300">
                  {errors.assessmentDate}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="assessment-status" required>
                Assessment Status
              </FieldLabel>

              <select
                id="assessment-status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className={INPUT_CLASS}
              >
                {ASSESSMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              {errors.status && (
                <p className="mt-1 text-xs text-rose-300">
                  {errors.status}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="total-marks">
                Maximum Marks
              </FieldLabel>

              <input
                id="total-marks"
                value={assessment.totalMarks ?? ''}
                disabled
                className={`${INPUT_CLASS} cursor-not-allowed opacity-60`}
              />

              <p className="mt-1 text-xs text-[#858590]">
                Maximum marks cannot be changed after assessment creation.
              </p>
            </div>

            <div>
              <FieldLabel htmlFor="passing-marks" required>
                Passing Marks
              </FieldLabel>

              <input
                id="passing-marks"
                name="passingMarks"
                type="number"
                min="0"
                max={assessment.totalMarks}
                step="any"
                value={form.passingMarks}
                onChange={handleChange}
                className={INPUT_CLASS}
              />

              {errors.passingMarks && (
                <p className="mt-1 text-xs text-rose-300">
                  {errors.passingMarks}
                </p>
              )}
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="assessment-description">
              Description
            </FieldLabel>

            <textarea
              id="assessment-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={5}
              maxLength={5000}
              className={INPUT_CLASS}
              placeholder="Enter assessment description..."
            />

            {errors.description && (
              <p className="mt-1 text-xs text-rose-300">
                {errors.description}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-sm font-semibold text-[#EAEAE6]">
              Academic Allocation
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#858590]">
                  Course
                </p>

                <p className="mt-2 text-sm text-[#D0D0D8]">
                  {typeof assessment.course === 'object'
                    ? assessment.course?.title || assessment.course?.name || 'Not available'
                    : assessment.course || 'Not available'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-[#858590]">
                  Course Code
                </p>

                <p className="mt-2 text-sm text-[#D0D0D8]">
                  {assessment.course?.code || assessment.courseCode || 'Not available'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-[#858590]">
                  Assigned Batches
                </p>

                <p className="mt-2 text-sm text-[#D0D0D8]">
                  {Array.isArray(assessment.batches)
                    ? assessment.batches.map((batch) => (
                        typeof batch === 'object'
                          ? batch.name || batch.code || getId(batch)
                          : batch
                      )).join(', ') || 'Not available'
                    : assessment.batch || 'Not available'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-[#858590]">
                  Assigned Sections
                </p>

                <p className="mt-2 text-sm text-[#D0D0D8]">
                  {Array.isArray(assessment.sections)
                    ? assessment.sections.map((section) => (
                        typeof section === 'object'
                          ? section.name || section.code || getId(section)
                          : section
                      )).join(', ') || 'Not available'
                    : assessment.section || 'Not available'}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-[#858590]">
              Course, batches and sections are fixed after assessment creation.
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
            <Link to="/hod/results">
              <ActionButton type="button" variant="secondary">
                Cancel
              </ActionButton>
            </Link>

            <ActionButton
              type="submit"
              loading={submitting}
              disabled={submitting}
            >
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </ActionButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}